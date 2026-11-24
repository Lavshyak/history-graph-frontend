import { useCallback } from 'react';
import {
    ReactFlow,
    useNodesState,
    useEdgesState,
    addEdge,
    MiniMap,
    Controls,
    Background,
    Panel,
} from '@xyflow/react';
import './index.css';

import { initialElements } from './initialElements.ts';

const { nodes: initialNodes, edges: initialEdges } = initialElements(15, 30);

const StressFlow = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const onConnect = useCallback(
        (params) => setEdges((els) => addEdge(params, els)),
        [],
    );

    const updatePos = useCallback(() => {
        setNodes((nds) => {
            return nds.map((node) => {
                return {
                    ...node,
                    position: {
                        x: Math.random() * 1500,
                        y: Math.random() * 1500,
                    },
                };
            });
        });
    }, []);

    return (
        <div style={{width:'90vw', height:'90vh'}}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                minZoom={0}
            >
                <MiniMap />
                <Controls />
                <Background />
                <Panel position="top-right">
                    <button
                        onClick={updatePos}
                        className="stress-test__button xy-theme__button"
                    >
                        change pos
                    </button>
                </Panel>
            </ReactFlow>
        </div>

    );
};

export default StressFlow;
