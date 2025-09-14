import { ReactFlow, Controls, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

function Flow() {
    return (
        <div style={{ height: '50vh', width: '50vh', color: "black", backgroundColor: "white"}} >
            <ReactFlow>
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}

export default Flow;
