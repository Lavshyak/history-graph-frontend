import { defineConfig } from '@kubb/core'
import { pluginOas } from '@kubb/plugin-oas'
import { pluginReactQuery } from '@kubb/plugin-react-query'
import { pluginTs } from '@kubb/plugin-ts'

export default defineConfig({
    input: {
        path: 'http://localhost:6513/openapi/v1.json'
    },
    output: {
        path: './src/gen',
        clean: true,
    },
    plugins: [
        pluginOas({
            validate: true,
            output: {
                path: './json',
            },
            serverIndex: 0,
            contentType: 'application/json'
        }),
        pluginTs({
            output: {
                path: './types',
            },
            exclude: [
                {
                    type: 'tag',
                    pattern: 'store',
                },
            ],
            group: {
                type: 'tag',
                name: ({ group }) => `'${group}Controller`
            },
            enumType: "asConst",
            enumSuffix: 'Enum',
            dateType: 'date',
            unknownType: 'unknown',
            optionalType: 'questionTokenAndUndefined',
            oasType: false,
        }),
        pluginReactQuery({
            output: {
                path: './hooks',
            },
            group: {
                type: 'tag',
                name: ({ group }) => `${group}Hooks`,
            },
            client: {
                dataReturnType: 'full',
                baseURL: 'http://localhost:6513/',
            },
            mutation: {
                methods: [ 'post', 'put', 'delete' ],
            },
            infinite: {
                queryParam: 'next_page',
                initialPageParam: 0,
                cursorParam: 'nextCursor',
            },
            query: {
                methods: [ 'get' ],
                importPath: "@tanstack/react-query"
            },
            suspense: {},
        }),
    ],
})
