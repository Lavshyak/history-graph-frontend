import {useGetHistoryGetall} from "../gen";
import {Bar, FlowGraph, NetworkGraph} from "@ant-design/charts";
import {Divider, Flex, List, Splitter} from "antd";
import SplitBar from "antd/es/splitter/SplitBar";

function AllView() {
    const getAllQuery = useGetHistoryGetall()
    let data = getAllQuery.data?.data
    if (!data) {
        data = {
            events: [],
            relations: []
        }
    }

    const nodes = data.events
    const edges = data.relations.map(r => ({
        id: r.id,
        source: r.fromId,
        target: r.toId,
        label: r.label
    }))

    return (<div>
        <Flex vertical={true}>
            <NetworkGraph
                containerStyle={{width: "max-content"}}
                background={"white"}
                data={{
                    nodes: nodes,
                    edges: edges
                }}
                node={{
                    style: {
                        labelText: (n) => n.id,
                        labelTextDecorationColor: "white"
                    }
                }}
                edge={{
                    style: {
                        endArrow: true
                    }
                }}
            ></NetworkGraph>
            <Divider style={{borderColor: "green"}}/>
            {JSON.stringify(data)}
            <Divider style={{borderColor: "green"}}/>
            <button onClick={() => {
                getAllQuery.refetch().finally(() => {
                    console.log("refetched")
                })
            }}>
                update
            </button>
        </Flex>
    </div>)
}

export default AllView