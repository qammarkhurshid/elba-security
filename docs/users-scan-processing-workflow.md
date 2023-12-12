# User Scan Function with Inngest

This tutorial details the setup of an Inngest function to perform user scans in a system using the Elba SDK.

## Overview

We're setting up a function that scans user data for specific tenants. This function uses Inngest for scheduling and execution, along with the Elba SDK for user data manipulation.

## Prerequisites

- Basic knowledge of JavaScript/TypeScript
- Setup with Inngest and Elba SDK
- Environment variables configured (`env`)

## Step 1: Import Dependencies

Start by importing the necessary modules and initializing the environment variables.

```javascript
import { Elba } from '@elba-security/sdk';
import { scanUsersByTenantId } from '@/repositories/microsoft/users';
import { env } from '@/common/env';
import { inngest } from '../client';
import { handleError } from '../functions/utils';
```
