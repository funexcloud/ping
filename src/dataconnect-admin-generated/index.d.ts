import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

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

/** Generated Node Admin SDK operation action function for the 'CreateObituary' Mutation. Allow users to execute without passing in DataConnect. */
export function createObituary(dc: DataConnect, vars: CreateObituaryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateObituaryData>>;
/** Generated Node Admin SDK operation action function for the 'CreateObituary' Mutation. Allow users to pass in custom DataConnect instances. */
export function createObituary(vars: CreateObituaryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateObituaryData>>;

/** Generated Node Admin SDK operation action function for the 'GetObituary' Query. Allow users to execute without passing in DataConnect. */
export function getObituary(dc: DataConnect, vars: GetObituaryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetObituaryData>>;
/** Generated Node Admin SDK operation action function for the 'GetObituary' Query. Allow users to pass in custom DataConnect instances. */
export function getObituary(vars: GetObituaryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetObituaryData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateObituary' Mutation. Allow users to execute without passing in DataConnect. */
export function updateObituary(dc: DataConnect, vars: UpdateObituaryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateObituaryData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateObituary' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateObituary(vars: UpdateObituaryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateObituaryData>>;

/** Generated Node Admin SDK operation action function for the 'ListMyObituaries' Query. Allow users to execute without passing in DataConnect. */
export function listMyObituaries(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListMyObituariesData>>;
/** Generated Node Admin SDK operation action function for the 'ListMyObituaries' Query. Allow users to pass in custom DataConnect instances. */
export function listMyObituaries(options?: OperationOptions): Promise<ExecuteOperationResponse<ListMyObituariesData>>;

