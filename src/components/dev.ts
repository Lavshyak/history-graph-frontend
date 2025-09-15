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
            label: "1->2"
        },
        {
            id: "r2",
            fromId: "id2",
            toId: "id3",
            label: "2->3"
        },
        {
            id: "r3",
            fromId: "id3",
            toId: "id1",
            label: "3->1"
        },
        {
            id: "r4",
            fromId: "id1",
            toId: "id3",
            label: "1->3"
        }
    ]}