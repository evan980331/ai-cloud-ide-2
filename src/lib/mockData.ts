export interface FileData {
    id: string;
    name: string;
    content: string;
    language: string;
}

export const mockProjects: Record<string, FileData[]> = {
    'demo-123': [
        {
            id: '1',
            name: 'index.ts',
            content: 'console.log("Welcome to Project 123!");',
            language: 'typescript'
        },
        {
            id: '2',
            name: 'styles.css',
            content: 'body { background: #000; color: #fff; }',
            language: 'css'
        }
    ],
    'todo-app': [
        {
            id: '1',
            name: 'App.tsx',
            content: 'export default function Todo() {\n  return <div>Todo List</div>;\n}',
            language: 'typescript'
        },
        {
            id: '2',
            name: 'utils.ts',
            content: 'export const formatDate = (d: Date) => d.toISOString();',
            language: 'typescript'
        }
    ],
    'new-project': [
        {
            id: '1',
            name: 'main.ts',
            content: '// Start coding here...',
            language: 'typescript'
        }
    ]
};
