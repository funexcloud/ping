# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetObituary*](#getobituary)
  - [*ListMyObituaries*](#listmyobituaries)
- [**Mutations**](#mutations)
  - [*CreateObituary*](#createobituary)
  - [*UpdateObituary*](#updateobituary)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetObituary
You can execute the `GetObituary` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getObituary(vars: GetObituaryVariables): QueryPromise<GetObituaryData, GetObituaryVariables>;

interface GetObituaryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetObituaryVariables): QueryRef<GetObituaryData, GetObituaryVariables>;
}
export const getObituaryRef: GetObituaryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getObituary(dc: DataConnect, vars: GetObituaryVariables): QueryPromise<GetObituaryData, GetObituaryVariables>;

interface GetObituaryRef {
  ...
  (dc: DataConnect, vars: GetObituaryVariables): QueryRef<GetObituaryData, GetObituaryVariables>;
}
export const getObituaryRef: GetObituaryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getObituaryRef:
```typescript
const name = getObituaryRef.operationName;
console.log(name);
```

### Variables
The `GetObituary` query requires an argument of type `GetObituaryVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetObituaryVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetObituary` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetObituaryData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetObituaryData {
  obituary?: {
    id: UUIDString;
    firstName: string;
    lastName: string;
    dateOfBirth: DateString;
    dateOfDeath: DateString;
    biography?: string | null;
    photoUrl?: string | null;
    isPublic: boolean;
    creator?: {
      id: UUIDString;
      displayName: string;
      email: string;
      profilePictureUrl?: string | null;
    } & User_Key;
      services_on_obituary: ({
        id: UUIDString;
        type: string;
        dateTime: TimestampString;
        locationName: string;
        address: string;
      } & Service_Key)[];
  } & Obituary_Key;
}
```
### Using `GetObituary`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getObituary, GetObituaryVariables } from '@dataconnect/generated';

// The `GetObituary` query requires an argument of type `GetObituaryVariables`:
const getObituaryVars: GetObituaryVariables = {
  id: ..., 
};

// Call the `getObituary()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getObituary(getObituaryVars);
// Variables can be defined inline as well.
const { data } = await getObituary({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getObituary(dataConnect, getObituaryVars);

console.log(data.obituary);

// Or, you can use the `Promise` API.
getObituary(getObituaryVars).then((response) => {
  const data = response.data;
  console.log(data.obituary);
});
```

### Using `GetObituary`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getObituaryRef, GetObituaryVariables } from '@dataconnect/generated';

// The `GetObituary` query requires an argument of type `GetObituaryVariables`:
const getObituaryVars: GetObituaryVariables = {
  id: ..., 
};

// Call the `getObituaryRef()` function to get a reference to the query.
const ref = getObituaryRef(getObituaryVars);
// Variables can be defined inline as well.
const ref = getObituaryRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getObituaryRef(dataConnect, getObituaryVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.obituary);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.obituary);
});
```

## ListMyObituaries
You can execute the `ListMyObituaries` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listMyObituaries(): QueryPromise<ListMyObituariesData, undefined>;

interface ListMyObituariesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyObituariesData, undefined>;
}
export const listMyObituariesRef: ListMyObituariesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyObituaries(dc: DataConnect): QueryPromise<ListMyObituariesData, undefined>;

interface ListMyObituariesRef {
  ...
  (dc: DataConnect): QueryRef<ListMyObituariesData, undefined>;
}
export const listMyObituariesRef: ListMyObituariesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyObituariesRef:
```typescript
const name = listMyObituariesRef.operationName;
console.log(name);
```

### Variables
The `ListMyObituaries` query has no variables.
### Return Type
Recall that executing the `ListMyObituaries` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyObituariesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyObituariesData {
  obituaries: ({
    id: UUIDString;
    firstName: string;
    lastName: string;
    dateOfDeath: DateString;
    dateOfBirth: DateString;
    isPublic: boolean;
  } & Obituary_Key)[];
}
```
### Using `ListMyObituaries`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyObituaries } from '@dataconnect/generated';


// Call the `listMyObituaries()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyObituaries();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyObituaries(dataConnect);

console.log(data.obituaries);

// Or, you can use the `Promise` API.
listMyObituaries().then((response) => {
  const data = response.data;
  console.log(data.obituaries);
});
```

### Using `ListMyObituaries`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyObituariesRef } from '@dataconnect/generated';


// Call the `listMyObituariesRef()` function to get a reference to the query.
const ref = listMyObituariesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyObituariesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.obituaries);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.obituaries);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateObituary
You can execute the `CreateObituary` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createObituary(vars: CreateObituaryVariables): MutationPromise<CreateObituaryData, CreateObituaryVariables>;

interface CreateObituaryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateObituaryVariables): MutationRef<CreateObituaryData, CreateObituaryVariables>;
}
export const createObituaryRef: CreateObituaryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createObituary(dc: DataConnect, vars: CreateObituaryVariables): MutationPromise<CreateObituaryData, CreateObituaryVariables>;

interface CreateObituaryRef {
  ...
  (dc: DataConnect, vars: CreateObituaryVariables): MutationRef<CreateObituaryData, CreateObituaryVariables>;
}
export const createObituaryRef: CreateObituaryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createObituaryRef:
```typescript
const name = createObituaryRef.operationName;
console.log(name);
```

### Variables
The `CreateObituary` mutation requires an argument of type `CreateObituaryVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateObituaryVariables {
  firstName: string;
  lastName: string;
  dateOfBirth: DateString;
  dateOfDeath: DateString;
}
```
### Return Type
Recall that executing the `CreateObituary` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateObituaryData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateObituaryData {
  obituary_insert: Obituary_Key;
}
```
### Using `CreateObituary`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createObituary, CreateObituaryVariables } from '@dataconnect/generated';

// The `CreateObituary` mutation requires an argument of type `CreateObituaryVariables`:
const createObituaryVars: CreateObituaryVariables = {
  firstName: ..., 
  lastName: ..., 
  dateOfBirth: ..., 
  dateOfDeath: ..., 
};

// Call the `createObituary()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createObituary(createObituaryVars);
// Variables can be defined inline as well.
const { data } = await createObituary({ firstName: ..., lastName: ..., dateOfBirth: ..., dateOfDeath: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createObituary(dataConnect, createObituaryVars);

console.log(data.obituary_insert);

// Or, you can use the `Promise` API.
createObituary(createObituaryVars).then((response) => {
  const data = response.data;
  console.log(data.obituary_insert);
});
```

### Using `CreateObituary`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createObituaryRef, CreateObituaryVariables } from '@dataconnect/generated';

// The `CreateObituary` mutation requires an argument of type `CreateObituaryVariables`:
const createObituaryVars: CreateObituaryVariables = {
  firstName: ..., 
  lastName: ..., 
  dateOfBirth: ..., 
  dateOfDeath: ..., 
};

// Call the `createObituaryRef()` function to get a reference to the mutation.
const ref = createObituaryRef(createObituaryVars);
// Variables can be defined inline as well.
const ref = createObituaryRef({ firstName: ..., lastName: ..., dateOfBirth: ..., dateOfDeath: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createObituaryRef(dataConnect, createObituaryVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.obituary_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.obituary_insert);
});
```

## UpdateObituary
You can execute the `UpdateObituary` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateObituary(vars: UpdateObituaryVariables): MutationPromise<UpdateObituaryData, UpdateObituaryVariables>;

interface UpdateObituaryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateObituaryVariables): MutationRef<UpdateObituaryData, UpdateObituaryVariables>;
}
export const updateObituaryRef: UpdateObituaryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateObituary(dc: DataConnect, vars: UpdateObituaryVariables): MutationPromise<UpdateObituaryData, UpdateObituaryVariables>;

interface UpdateObituaryRef {
  ...
  (dc: DataConnect, vars: UpdateObituaryVariables): MutationRef<UpdateObituaryData, UpdateObituaryVariables>;
}
export const updateObituaryRef: UpdateObituaryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateObituaryRef:
```typescript
const name = updateObituaryRef.operationName;
console.log(name);
```

### Variables
The `UpdateObituary` mutation requires an argument of type `UpdateObituaryVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateObituaryVariables {
  id: UUIDString;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: DateString | null;
  dateOfDeath?: DateString | null;
  biography?: string | null;
  photoUrl?: string | null;
  isPublic?: boolean | null;
}
```
### Return Type
Recall that executing the `UpdateObituary` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateObituaryData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateObituaryData {
  obituary_update?: Obituary_Key | null;
}
```
### Using `UpdateObituary`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateObituary, UpdateObituaryVariables } from '@dataconnect/generated';

// The `UpdateObituary` mutation requires an argument of type `UpdateObituaryVariables`:
const updateObituaryVars: UpdateObituaryVariables = {
  id: ..., 
  firstName: ..., // optional
  lastName: ..., // optional
  dateOfBirth: ..., // optional
  dateOfDeath: ..., // optional
  biography: ..., // optional
  photoUrl: ..., // optional
  isPublic: ..., // optional
};

// Call the `updateObituary()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateObituary(updateObituaryVars);
// Variables can be defined inline as well.
const { data } = await updateObituary({ id: ..., firstName: ..., lastName: ..., dateOfBirth: ..., dateOfDeath: ..., biography: ..., photoUrl: ..., isPublic: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateObituary(dataConnect, updateObituaryVars);

console.log(data.obituary_update);

// Or, you can use the `Promise` API.
updateObituary(updateObituaryVars).then((response) => {
  const data = response.data;
  console.log(data.obituary_update);
});
```

### Using `UpdateObituary`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateObituaryRef, UpdateObituaryVariables } from '@dataconnect/generated';

// The `UpdateObituary` mutation requires an argument of type `UpdateObituaryVariables`:
const updateObituaryVars: UpdateObituaryVariables = {
  id: ..., 
  firstName: ..., // optional
  lastName: ..., // optional
  dateOfBirth: ..., // optional
  dateOfDeath: ..., // optional
  biography: ..., // optional
  photoUrl: ..., // optional
  isPublic: ..., // optional
};

// Call the `updateObituaryRef()` function to get a reference to the mutation.
const ref = updateObituaryRef(updateObituaryVars);
// Variables can be defined inline as well.
const ref = updateObituaryRef({ id: ..., firstName: ..., lastName: ..., dateOfBirth: ..., dateOfDeath: ..., biography: ..., photoUrl: ..., isPublic: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateObituaryRef(dataConnect, updateObituaryVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.obituary_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.obituary_update);
});
```

