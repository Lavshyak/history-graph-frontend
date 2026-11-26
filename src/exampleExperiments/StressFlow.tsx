import { useCallback, useMemo } from 'react';
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
import { CombinedEdges } from './CombinedEdges.tsx';

const { nodes: initialNodes, edges: initialEdges } = initialElements(15, 30);

const StressFlow = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Edges are drawn by <CombinedEdges /> as a single SVG path, so we hand React
    // Flow the same edges marked as `hidden`: it keeps them in its store (so
    // connections/lookups stay consistent) but renders no per-edge DOM at all.
    const hiddenEdges = useMemo(() => edges.map((edge) => ({ ...edge, hidden: true })), [edges]);

    const onConnect = useCallback(
        // @ts-expect-error pofig
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
                edges={hiddenEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                minZoom={0}
                //onlyRenderVisibleElements={true} // начинает фризить в хроме, в фирфоксе становится хуже
            >
                <CombinedEdges edges={edges} />
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
