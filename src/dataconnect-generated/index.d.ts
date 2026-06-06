import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface CreateObituaryData {
  obituary_insert: Obituary_Key;
}

export interface CreateObituaryVariables {
  firstName: string;
  lastName: string;
  dateOfBirth: DateString;
  dateOfDeath: DateString;
}

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

export interface GetObituaryVariables {
  id: UUIDString;
}

export interface Invitation_Key {
  id: UUIDString;
  __typename?: 'Invitation_Key';
}

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

export interface Notification_Key {
  id: UUIDString;
  __typename?: 'Notification_Key';
}

export interface Obituary_Key {
  id: UUIDString;
  __typename?: 'Obituary_Key';
}

export interface Service_Key {
  id: UUIDString;
  __typename?: 'Service_Key';
}

export interface UpdateObituaryData {
  obituary_update?: Obituary_Key | null;
}

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

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface CreateObituaryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateObituaryVariables): MutationRef<CreateObituaryData, CreateObituaryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateObituaryVariables): MutationRef<CreateObituaryData, CreateObituaryVariables>;
  operationName: string;
}
export const createObituaryRef: CreateObituaryRef;

export function createObituary(vars: CreateObituaryVariables): MutationPromise<CreateObituaryData, CreateObituaryVariables>;
export function createObituary(dc: DataConnect, vars: CreateObituaryVariables): MutationPromise<CreateObituaryData, CreateObituaryVariables>;

interface GetObituaryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetObituaryVariables): QueryRef<GetObituaryData, GetObituaryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetObituaryVariables): QueryRef<GetObituaryData, GetObituaryVariables>;
  operationName: string;
}
export const getObituaryRef: GetObituaryRef;

export function getObituary(vars: GetObituaryVariables): QueryPromise<GetObituaryData, GetObituaryVariables>;
export function getObituary(dc: DataConnect, vars: GetObituaryVariables): QueryPromise<GetObituaryData, GetObituaryVariables>;

interface UpdateObituaryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateObituaryVariables): MutationRef<UpdateObituaryData, UpdateObituaryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateObituaryVariables): MutationRef<UpdateObituaryData, UpdateObituaryVariables>;
  operationName: string;
}
export const updateObituaryRef: UpdateObituaryRef;

export function updateObituary(vars: UpdateObituaryVariables): MutationPromise<UpdateObituaryData, UpdateObituaryVariables>;
export function updateObituary(dc: DataConnect, vars: UpdateObituaryVariables): MutationPromise<UpdateObituaryData, UpdateObituaryVariables>;

interface ListMyObituariesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyObituariesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListMyObituariesData, undefined>;
  operationName: string;
}
export const listMyObituariesRef: ListMyObituariesRef;

export function listMyObituaries(): QueryPromise<ListMyObituariesData, undefined>;
export function listMyObituaries(dc: DataConnect): QueryPromise<ListMyObituariesData, undefined>;

