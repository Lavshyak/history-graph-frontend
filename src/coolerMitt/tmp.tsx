/*

// eventBus.ts
import mitt from "mitt";
export const bus = mitt<{ loggedIn: string }>();

// A.tsx
bus.emit("loggedIn", "User123");

// B.tsx
import { useEffect, useState } from "react";

export function B() {
    const [user, setUser] = useState("");

    useEffect(() => {
        bus.on("loggedIn", setUser);
        return () => bus.off("loggedIn", setUser);
    }, []);

    return <div>Пользователь: {user}</div>;
}

bus.off()*/
