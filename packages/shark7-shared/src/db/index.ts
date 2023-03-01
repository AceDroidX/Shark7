import { Db, MongoClient } from 'mongodb'
import { EventDBs } from '../database'
export * from './client'

export async function getDBInstance<T extends EventDBs>(client: MongoClient, eventdbs: {
    dbname: string, postCollList: string[], new(db: Db): T
}) {
    const db = client.db(eventdbs.dbname)
    await initPostChangeColl(db, eventdbs.postCollList)
    return new eventdbs(db)
}

const PostChangeStream = { changeStreamPreAndPostImages: { enabled: true } }
async function initPostChangeColl(db: Db, collList: string[]) {
    for (const item of await db.listCollections({}, { nameOnly: false }).toArray()) {
        if (collList.includes(item.name)) {
            if (item.options?.changeStreamPreAndPostImages?.enabled) {
                const index = collList.indexOf(item.name);
                if (index > -1) {
                    collList.splice(index, 1)
                }
            } else {
                db.command({ collMod: item.name, changeStreamPreAndPostImages: { enabled: true } })
            }
        }
    }
    await Promise.all(collList.map(name => db.createCollection(name, PostChangeStream)))
}
