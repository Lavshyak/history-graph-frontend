import React, {useEffect, useMemo, useState} from "react";
import {Graph, DefaultLink, DefaultNode} from "@visx/network";
import {Collapse, Divider, Flex} from "antd";
import {useGetHistoryGetall} from "../../gen";
import {devDtoEventsAndRelationshipsMock} from "../dev.ts";
import prettifyGraph3 from "./prettifyGraph3.ts";

type NodeData = {
    id: string;
    title: string;
    description: string;
};

type LinkData = {
    source: NodeData;
    target: NodeData;
    label?: string;
};

function EventNode({node}: { node: NodeData }) {
    return (
        <foreignObject width={200} height={100} x={-100} y={-50}>
            <div style={{color: "black", backgroundColor: "white"}}>
                <Collapse
                    items={[
                        {
                            label: (
                                <Flex vertical>
                                    <div>{node.title}</div>
                                    <div style={{fontSize: 11}}>{node.id}</div>
                                </Flex>
                            ),
                            children: (
                                <Flex vertical>
                                    <div>{node.description}</div>
                                </Flex>
                            ),
                        },
                    ]}
                />
            </div>
        </foreignObject>
    );
}

function AllViewVisx() {
    const getAllQuery = useGetHistoryGetall();
    const rawData =
        useMemo(
            () => getAllQuery.data?.data ?? devDtoEventsAndRelationshipsMock,
            [getAllQuery.data]
        );

    const [graph, setGraph] = useState({nodes: [], links: []});

    useEffect(() => {
        const nodes: NodeData[] = rawData.events.map((n) => ({
            id: n.id.toString(),
            title: n.title,
            description: n.description,
        }));

        const links: LinkData[] = rawData.relationships.map((r) => ({
            source: r.fromId.toString(),
            target: r.toId.toString(),
            label: r.label,
        }));
        prettifyGraph3(nodes, links)
            .then(g => {
                const links = g.edges.map(e => ({
                    ...e,
                    source: g.nodes.find(n => n.id === e.source),
                    target: g.nodes.find(n => n.id === e.target),
                }))
                setGraph({nodes: g.nodes, links: links})
            })
    }, [rawData])

    return (
        <Flex vertical>
            <svg width={800} height={600} style={{background: "#fafafa"}}>
                <Graph<NodeData, LinkData>
                    graph={graph}
                    nodeComponent={EventNode}
                    linkComponent={DefaultLink}
                />
            </svg>
            <Divider style={{borderColor: "green"}}/>
            {JSON.stringify(rawData)}
            <Divider style={{borderColor: "green"}}/>
            <button onClick={() => getAllQuery.refetch().finally(() => console.log("refetched"))}>
                update
            </button>

        </Flex>

    );
}

export default AllViewVisx;
