import "reflect-metadata"
import { MikroORM } from "@mikro-orm/core"
import { __prod__ } from "./constants"
import microConfig from "./mikro-orm.config"
import express from "express"
import { ApolloServer } from "apollo-server-express"
import { buildSchema } from "type-graphql"
import { PostResolver } from "./resolvers/PostResolver"
import { UserResolver } from "./resolvers/UserResolver"
import redis from "redis"
import session from "express-session"
import connectRedis from "connect-redis"
import { MyContext } from "./types"

const main = async () => {
    const orm = await MikroORM.init(microConfig);
    await orm.getMigrator().up()

    const app = express();

    const RedisStore = connectRedis(session);
    const redisClient = redis.createClient()

    app.use(session({
        name: "qId",
        store: new RedisStore({
            client: redisClient,
            disableTouch: true,
        }),
        cookie:{
            maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
            httpOnly: true,
            sameSite: "lax", //csrf
            secure: __prod__ // cookie only works on https
        },
        saveUninitialized: false,
        secret: "dsfsdfsdfdsfsdfsdf",
        resave: false
    }));

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [PostResolver, UserResolver],
            validate: false
        }),

        context: ({req, res}) : MyContext => ({ em: orm.em, req, res })
    })

    apolloServer.applyMiddleware({ app })
    app.listen(4000, () => console.log("Server on localhost:4000"))
}

main().catch(err => console.warn(err));