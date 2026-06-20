import type { Person } from './types';

const DB_NAME = 'face-name-trainer';
const STORE = 'people';
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    transaction.oncomplete = () => { db.close(); resolve(request ? request.result : undefined); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

export async function getPeople(): Promise<Person[]> {
  return (await tx('readonly', (store) => store.getAll())) as Person[];
}

export async function savePerson(person: Person): Promise<void> {
  await tx('readwrite', (store) => { store.put(person); });
}

export async function deletePerson(id: string): Promise<void> {
  await tx('readwrite', (store) => { store.delete(id); });
}

export async function clearPeople(): Promise<void> {
  await tx('readwrite', (store) => { store.clear(); });
}

export async function importPeople(people: Person[]): Promise<void> {
  await tx('readwrite', (store) => {
    people.forEach((person) => store.put(person));
  });
}
