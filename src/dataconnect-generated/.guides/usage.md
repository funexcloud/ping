# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createObituary, getObituary, updateObituary, listMyObituaries } from '@dataconnect/generated';


// Operation CreateObituary:  For variables, look at type CreateObituaryVars in ../index.d.ts
const { data } = await CreateObituary(dataConnect, createObituaryVars);

// Operation GetObituary:  For variables, look at type GetObituaryVars in ../index.d.ts
const { data } = await GetObituary(dataConnect, getObituaryVars);

// Operation UpdateObituary:  For variables, look at type UpdateObituaryVars in ../index.d.ts
const { data } = await UpdateObituary(dataConnect, updateObituaryVars);

// Operation ListMyObituaries: 
const { data } = await ListMyObituaries(dataConnect);


```