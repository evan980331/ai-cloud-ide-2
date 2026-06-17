import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Setup Supabase admin client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to run C/C++/Python via Godbolt (Compiler Explorer) API
async function runGodbolt(compilerId: string, code: string, stdin: string) {
    const response = await fetch(`https://godbolt.org/api/compiler/${compilerId}/compile`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            source: code,
            options: {
                userArguments: '',
                executeParameters: {
                    args: [],
                    stdin: stdin || ''
                },
                compilerOptions: {
                    executorRequest: true
                },
                filters: {
                    execute: true
                }
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Godbolt API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    const stdoutStr = (data.stdout || []).map((line: any) => line.text).join('\n');
    const stderrStr = (data.stderr || []).map((line: any) => line.text).join('\n');
    
    let compilerMessage = '';
    if (data.buildResult) {
        const buildStderr = (data.buildResult.stderr || []).map((line: any) => line.text).join('\n');
        const buildStdout = (data.buildResult.stdout || []).map((line: any) => line.text).join('\n');
        compilerMessage = [buildStdout, buildStderr].filter(Boolean).join('\n');
    }
    
    const banner = '⚠️ [System: Wandbox is overloaded. Automatically fell back to Compiler Explorer (Godbolt) for execution.]\n';
    
    return {
        status: data.didExecute ? String(data.code) : "1",
        program_output: stdoutStr,
        program_error: data.didExecute ? stderrStr : (stderrStr || 'Execution failed to run'),
        compiler_message: banner + (compilerMessage || (data.didExecute ? 'Execution successful' : 'Compilation failed'))
    };
}

// Helper to run JS/TS locally
async function runJsTsLocally(code: string, stdin: string, isTs: boolean) {
    const tempDir = path.join(process.cwd(), '.temp_run');
    await fs.mkdir(tempDir, { recursive: true });
    
    const runId = Math.random().toString(36).substring(2, 15);
    const workDir = path.join(tempDir, runId);
    await fs.mkdir(workDir, { recursive: true });
    
    const fileName = isTs ? 'code.ts' : 'code.js';
    const filePath = path.join(workDir, fileName);
    await fs.writeFile(filePath, code, 'utf8');
    
    const runCmd = 'npx';
    const runArgs = isTs ? ['tsx', 'code.ts'] : ['node', 'code.js'];
    
    const runResult = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
        const child = spawn(runCmd, runArgs, { cwd: workDir, shell: true });
        
        let stdout = '';
        let stderr = '';
        
        const timer = setTimeout(() => {
            child.kill('SIGKILL');
        }, 10000);
        
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        
        if (stdin) {
            child.stdin.write(stdin);
            child.stdin.end();
        } else {
            child.stdin.end();
        }
        
        child.on('close', (code) => {
            clearTimeout(timer);
            resolve({ code, stdout, stderr });
        });
        
        child.on('error', (err) => {
            clearTimeout(timer);
            resolve({ code: -1, stdout: '', stderr: err.message });
        });
    });
    
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    
    const banner = '⚠️ [System: Wandbox is overloaded. Automatically fell back to Local Node Runner for execution.]\n';
    
    return {
        status: String(runResult.code),
        program_output: runResult.stdout,
        program_error: runResult.stderr,
        compiler_message: banner + (isTs ? 'Compiled/Transpiled via local tsx runner' : 'Executed via local node runner')
    };
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { code, compiler, options, compiler_option, stdin, clientId } = body;

        if (!clientId) {
            return NextResponse.json({ error: 'Missing client ID' }, { status: 400 });
        }

        // --- Rate Limiting Logic ---
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        const { count, error: countError } = await supabase
            .from('rate_limits')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', clientId)
            .eq('endpoint', 'run')
            .gte('created_at', oneMinuteAgo);

        if (countError) {
            console.error('Rate Limit Check Error:', countError);
        }

        if (count !== null && count >= 10) {
            return NextResponse.json(
                { error: 'Rate limit exceeded: Please wait before running code again.' },
                { status: 429 }
            );
        }

        // Log this request
        await supabase.from('rate_limits').insert({
            client_id: clientId,
            endpoint: 'run'
        });

        // Helper to check if a Wandbox response indicates overload/failure
        const isWandboxOverloaded = (data: any) => {
            if (!data) return true;
            const output = (data.program_output || '') + 
                           (data.program_error || '') + 
                           (data.compiler_message || '') + 
                           (data.compiler_output || '');
            return data.status === 126 || 
                   data.status === '126' || 
                   output.includes('OCI runtime error') || 
                   output.includes('Resource temporarily unavailable');
        };

        // Helper to invoke fallback compilers based on compiler string
        const handleFallback = async () => {
            console.log(`Wandbox failed or overloaded for compiler: ${compiler}. Triggering fallback...`);
            if (compiler === 'gcc-13.2.0') {
                return await runGodbolt('g132', code, stdin);
            } else if (compiler === 'gcc-13.2.0-c') {
                return await runGodbolt('cg132', code, stdin);
            } else if (compiler === 'cpython-3.14.0') {
                return await runGodbolt('python313', code, stdin);
            } else if (compiler === 'nodejs-20.17.0') {
                return await runJsTsLocally(code, stdin, false);
            } else if (compiler === 'typescript-5.6.2') {
                return await runJsTsLocally(code, stdin, true);
            }
            throw new Error('No fallback available for this language environment.');
        };

        // --- Try Wandbox Proxy ---
        try {
            const response = await fetch('https://wandbox.org/api/compile.json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    compiler,
                    options,
                    compiler_option,
                    save: true,
                    stdin: stdin || ''
                })
            });

            if (!response.ok) {
                console.warn(`Wandbox API responded with non-ok status: ${response.status}. Trying fallback...`);
                const fallbackData = await handleFallback();
                return NextResponse.json(fallbackData);
            }

            const data = await response.json();
            
            if (isWandboxOverloaded(data)) {
                console.warn('Wandbox returned OCI runtime or Resource temporarily unavailable error. Trying fallback...');
                const fallbackData = await handleFallback();
                return NextResponse.json(fallbackData);
            }

            return NextResponse.json(data);

        } catch (wandboxErr: any) {
            console.error('Wandbox fetch failed:', wandboxErr);
            console.log('Attempting fallback compiler after fetch error...');
            const fallbackData = await handleFallback();
            return NextResponse.json(fallbackData);
        }

    } catch (error: any) {
        console.error('API Run Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
