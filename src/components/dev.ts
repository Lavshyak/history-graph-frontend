import type {DtoEventsAndRelationships} from "../gen";

export const devDtoEventsAndRelationshipsMock: DtoEventsAndRelationships = {events: [
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
        {
            id: "3->1",
            fromId: "id1",
            toId: "id3",
            label: "l4"
        }
    ]}