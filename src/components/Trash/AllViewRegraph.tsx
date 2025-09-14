import {type DtoEventsAndRelationships, useGetHistoryGetall} from "../../gen";
import {useEffect, useMemo, useState} from "react";
import "@xyflow/react/dist/style.css";
import {Divider, Flex} from "antd";
import {GraphCanvas, type GraphEdge, type GraphNode} from "reagraph";
import { Html } from "@react-three/drei";

const devDtoEventsAndRelationships: DtoEventsAndRelationships = {
    events: [
        {
            title: "t1",
            id: "id1",
            timeFrom: new Date(Date.now()),
            timeTo: new Date(Date.now()),
            keywords: ["k1", "k2"],
            description: "description 1",
        },
        {
            title: "t2",
            id: "id2",
            timeFrom: new Date(Date.now()),
            timeTo: new Date(Date.now()),
            keywords: ["k1", "k2"],
            description: "description 2",
        },
        {
            title: "t3",
            id: "id3",
            timeFrom: new Date(Date.now()),
            timeTo: new Date(Date.now()),
            keywords: ["k1", "k2"],
            description: "description 3",
        }
    ], relationships: [
        {
            id: "r1",
            fromId: "id1",
            toId: "id2",
            label: "l1"
        },
        {
            id: "r2",
            fromId: "id2",
            toId: "id3",
            label: "l2"
        },
        {
            id: "r3",
            fromId: "id3",
            toId: "id1",
            label: "l3"
        },
    ]
}

function AllViewRegraph() {
    console.log("before getAllQuery")
    const getAllQuery = useGetHistoryGetall();
    const rawData = useMemo(() => getAllQuery.data?.data ?? devDtoEventsAndRelationships, [getAllQuery.data])
    console.log("rawData:", rawData);

    const [nodes, setNodes] = useState<GraphNode[]>([])
    const [edges, setEdges] = useState<GraphEdge[]>([])

    useEffect(
        () => {
            const nodes = rawData.events.map((n) => ({
                id: n.id.toString(),
                data: {title: n.title, description: n.description, id: n.id},
                position: {x: 0, y: 0},
                type: "EventNode"
            }));

            const edges = rawData.relationships.map((r) => ({
                id: r.id.toString(),
                source: r.fromId.toString(),
                target: r.toId.toString(),
                label: r.label
            }));

            /*const prettified = prettifyGraph(nodes, edges, "LR")
            setNodes(prettified.nodes)
            setEdges(prettified.edges)*/
            /*setNodes(rawData.events)
            setEdges(rawData.relationships)*/
            setNodes(nodes)
            setEdges(edges)
            /*prettifyGraph2(nodes, edges).then(() => {
                setNodes(nodes)
                setEdges(edges)
            })*/
        },
        [rawData])

    console.log("nodes:", nodes);
    console.log("edges:", edges);
    return (
        <div>
            <Flex vertical>
                <div style={{
                    position: "relative",
                    height: "50vh",
                    width: "50vw",
                }}>
                    <GraphCanvas
                        nodes={nodes}
                        edges={edges}
                        renderNode={({ size, color, opacity, node }) => (
                            <group>
                                <Html>
                                    aaaaaaa
                                </Html>
                                <mesh>
                                    <torusKnotGeometry attach="geometry" args={[size, 1.25, 50, 8]}/>
                                    <meshBasicMaterial
                                        attach="material"
                                        color={color}
                                        opacity={opacity}
                                        transparent
                                    />
                                </mesh>
                            </group>
                        )}
                    />
                </div>
                <Divider style={{borderColor: "green"}}/>
                {JSON.stringify(rawData)}
                <Divider style={{borderColor: "green"}}/>
                <button onClick={() => getAllQuery.refetch().finally(() => console.log("refetched"))}>
                    update
                </button>
            </Flex>
        </div>
    );
}

export default AllViewRegraph;
