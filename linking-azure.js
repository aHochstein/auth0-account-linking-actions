const client = (event) => {
  const managementApi = require("auth0").ManagementClient;
  return new managementApi({
      domain: event.secrets.domain,
      clientId: event.secrets.client_id,
      clientSecret: event.secrets.client_secret
    })
}

const linkAccounts = async (client, primaryUserId, azure_id, connection_id) => {
  try {
    await client.linkUsers(primaryUserId, {
      user_id: `${azure_id}`,
      connection_id: connection_id,
      provider: "waad"
    })
    console.log(`linking successful for user ${primaryUserId} with azure ${azure_id}`)
  } catch(error) {
    console.log(`linking failed for user ${primaryUserId} with azure ${azure_id} because of: ${error}`)
  }  
}

const getUserByEmail = async (client, email, primary_provider) => {
  try {
    var users = await client.getUsersByEmail(email);
    var existingFederatedAccount = users.filter(user => user.user_id.startsWith(primary_provider));
    return existingFederatedAccount[0];
  } catch(error) {
      console.log(error)
    }  
}
/**
* Handler that will be called during the execution of a PostLogin flow.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onExecutePostLogin = async (event, api) => {
  if (event.connection.name !== event.secrets.linked_connection_name) {
     console.log("exit wrong conn");
    return;
  }

  if(!event.user.email?.endsWith(event.secrets.email_domain)) {
    console.log("exit wrong email");
    return;
  }


  const alreadyLinked = event.user.identities.filter(identity => identity.provider === event.secrets.primary_provider).length > 0;

  if (alreadyLinked) {
     console.log("exit has linked azure ad");
    return;
  }

  let existingUser = await getUserByEmail(client(event), event.user.email, event.secrets.primary_provider);

  if(existingUser) {
    await linkAccounts(client(event), existingUser.user_id, event.user.user_id, event.secrets.linked_connection_id)
  }
  
};


/**
* Handler that will be invoked when this action is resuming after an external redirect. If your
* onExecutePostLogin function does not perform a redirect, this function can be safely ignored.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
// exports.onContinuePostLogin = async (event, api) => {
// };
