import Dexie, { type EntityTable } from 'dexie'
import type { Comanda } from '../types'

const db = new Dexie('PizzariaDB') as Dexie & {
  comandas: EntityTable<Comanda, 'id'>
}

db.version(1).stores({
  comandas: '++id, numero, status, criadaEm, finalizadaEm',
})

db.version(2).stores({
  comandas: '++id, numero, status, criadaEm, finalizadaEm, tipoAtendimento',
})

export default db
