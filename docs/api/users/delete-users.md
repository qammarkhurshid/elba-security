## Delete users

This endpoint enables the removal of users from a specified organisation in the Elba system using either their unique identifiers or a date criterion.

### DELETE User Data

> Version 1.0

This method supports the deletion of users from an organisation by specifying either a list of user IDs or a `syncedBefore` timestamp. Note that `ids` and `syncedBefore` should not be provided simultaneously.

```plaintext
DELETE /api/rest/users
```

Supported attributes:

| Attribute                | Type         | Required | Description                                        |
|--------------------------|--------------|----------|----------------------------------------------------|
| `organisationId`  **(uuid)**       | string       | Yes      | Unique identifier for the organisation.  
| `sourceId` **(uuid)**               | string   | Yes      | Unique source identifier for           |
| `ids`                    | array| conditional       | Array of user identifiers to be deleted.           |
| `syncedBefore`           | datetime     | conditional       | Timestamp to delete users synced before this time. |

Note: `ids` and `syncedBefore` are mutually exclusive and should not be provided together.

If successful, returns [`200`](rest/index.md#status-codes) and the following response attributes:

| Attribute                | Type     | Description                          |
|--------------------------|----------|--------------------------------------|
| `success`                | boolean  | Indicates if the operation succeeded.|

Example request for deletion by user `ids`:
### CURL:
```shell
curl --request DELETE \
  --url "https://api.elba.ninja/api/rest/users" \
  --header "Content-Type: application/json" \
  --header "X-elba-Api-Key: ELBA_API_KEY" \
  --data '{
    "organisationId": "organisation_id",
    "ids": ["user-id-1", "user-id-2"]
  }'
```

Example request for deletion by `syncedBefore`:

```shell
curl --header "PRIVATE-TOKEN: <your_access_token>" \
  --request DELETE \
  --url "https://api.elba.ninja/api/rest/users" \
  --header "Content-Type: application/json" \
  --header "X-elba-Api-Key: ELBA_API_KEY" \
  --data '{
    "organisationId": "organisation_id",
    "syncedBefore": "2023-06-06T13:50:07.138Z"
  }'
```

### Elba SDK:

#####  Delete the elba users that has been sent before this sync
```javascript
  elba.users.delete({ 
    syncedBefore: "2023-01-01T00:00:00.000Z",
  })
```

##### Delete users by id
```javascript
elba.users.delete({ ids: ['user-id-1', 'user-id-2'] })  
```

Example success response:

```json
{
  "success": true
}
```