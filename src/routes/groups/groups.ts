import {server, database} from "../../index";
import {RootCollections, SubCollections} from "../../firebase/collections";
import {MessageFactory, MessageFactoryPrimaryDomain, MessageFactorySecondaryDomain, MessageFactoryOperation, MessageFactoryResult} from "../../utilities/MessageFactory";
import {RecipeValidationEngine} from "../../validation/RecipeValidationEngine";
import {NewGroupRequest, GroupUser, GroupUserRole, SenderInvite, RecipientInvite, AddRecipeToGroupRequest} from "../../models/index";

/**
 * Creates a new group.
 */
server.route('/api/groups').post((request, response) => {
    const {name, owner} = request.body;

    const groupDocument = database.collection(RootCollections.GROUPS).doc();
    const groupDocumentId = groupDocument.id;

    const newGroup: NewGroupRequest = {
        id: groupDocumentId,
        name
    };

    const newOwner: GroupUser = {
        id: owner,
        role: GroupUserRole.OWNER
    };

    // Initiate a batch operation
    const batch = database.batch();

    // Queue the creation of a new group
    batch.set(groupDocument, newGroup);

    // Queue the addition of the group owner as a member
    batch.set(groupDocument.collection(SubCollections.GROUP_MEMBERS).doc(owner), newOwner);

    // Commit the batch operation for group creation and member addition
    batch.commit()
        .then(() => {
            response.status(200).send(`Group ${groupDocumentId} successfully created`);
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            response.status(400).send(`Error creating new group: ${error.message}`);
        });
});

/**
 * Gets all groups.
 */
server.route('/api/groups').get((request, response) => {
    database.collection(RootCollections.GROUPS).get()
        .then((snapshot: firebase.firestore.QuerySnapshot) => {
            if (snapshot.docs.length) {
                const groups = snapshot.docs.map((group: any) => group.data());
                response.status(200).send(groups);
            } else {
                response.status(404).send("There are no groups");
            }
        })
        .catch((error: firebase.FirebaseError) => {
            response.status(400).send(`Error getting groups: ${error.message}`);
        })
});

/**
 * Gets a specific group.
 */
server.route('/api/groups/:group').get((request, response) => {
    const group = request.params['group'];

    database.collection(RootCollections.GROUPS).doc(group).get()
        .then((document: any) => {
            if (document.exists) {
                response.status(200).send(document.data());
            } else {
                response.status(404).send("Group not found")
            }
        })
        .catch((error: any) => {
            response.status(400).send(`Error getting group ${group}: ${error.message}`);
        });
});

/**
 * Gets a group's invites.
 */
server.route('/api/groups/:group/invites').get((request, response) => {
    const groupId = request.params['group'];

    database.collection(RootCollections.GROUPS).doc(groupId).collection(SubCollections.INVITES).get()
        .then((snapshot: firebase.firestore.QuerySnapshot) => {
            if (snapshot.docs.length) {
                const invites = snapshot.docs.map((invite: any) => invite.data());
                response.status(200).send(invites);
            } else {
                response.status(404).send("There are no invites for this group");
            }
        })
        .catch((error: any) => {
            response.status(400).send(error);
        })
});

/**
 * Invites a user to a group.
 */
server.route('/api/groups/:group/invite').post((request, response) => {
    const group = request.params['group'];
    const {sender, recipient} = request.body;

    const groupInviteDocument = database.collection(RootCollections.GROUPS).doc(group).collection(SubCollections.INVITES).doc();
    const inviteId = groupInviteDocument.id;
    const personInviteDocument = database.collection(RootCollections.PEOPLE).doc(recipient).collection(SubCollections.INVITES).doc(inviteId);

    const senderInvite: SenderInvite = {
        inviteId,
        sender,
        recipient,
        group,
        active: true,
        answer: null
    };

    const recipientInvite: RecipientInvite = {
        inviteId,
        sender,
        group,
        active: true,
        answer: null
    };

    // Initiate a batch operation
    const batch = database.batch();

    // Queue the association of the sender invite to the group
    batch.set(groupInviteDocument, senderInvite);

    // Queue the association of the recipient's invite to their profile
    batch.set(personInviteDocument, recipientInvite);

    // Batch commit the updates to the group and profile invites
    batch.commit()
        .then(() => {
            response.status(200).send(`Invite to group ${group} sent to user ${recipient}`);
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            response.status(400).send(error);
        });
});

/**
 * Gets all recipes from a group.
 */
server.route('/api/groups/:group/recipes/').get((request, response) => {
    const group = request.params['group'];

    const recipeCollectionReference = database.collection(RootCollections.GROUPS).doc(group).collection(SubCollections.RECIPES);

    recipeCollectionReference.get()
        .then((snapshot: firebase.firestore.QuerySnapshot) => {
            if (snapshot.docs.length) {
                const recipes = snapshot.docs.map((recipe: any) => recipe.data());
                response.status(200).send(recipes);
            } else {
                response.status(404).send(`There are no recipes linked to group ${group}`);
            }
        })
        .catch((error: any) => {
            response.status(400).send(`Error retrieving recipes from group ${group}`);
        })
});

/**
 * Links a recipe to a group.
 */
server.route('/api/groups/:group/recipes').post((request, response) => {
    const group = request.params['group'];
    const {recipeOwnerId, recipeId} = request.body;

    const recipeToAdd: AddRecipeToGroupRequest = {
        recipeOwnerId,
        recipeId
    };

    const newGroupRecipe = database.collection(RootCollections.GROUPS).doc(group).collection(SubCollections.RECIPES).doc(recipeId);

    database.runTransaction(transaction => {
        return transaction.get(newGroupRecipe)
            .then(result => {
                if (result.exists) {
                    response.status(409).send(`Recipe ${recipeId} is already linked to group ${group}`);
                } else {
                    newGroupRecipe.set(recipeToAdd)
                        .then(result => {
                            response.status(200).send(`Recipe ${newGroupRecipe.id} linked to group ${group}`);
                        });
                }
            }).catch(error => {
                response.status(400).send(`Failure linking recipe ${recipeToAdd.recipeId} to group ${group}`);
            });
    });
});

/**
 * Unlinks a recipe from a group.
 */
server.route('/api/groups/:group/recipes/:recipe').delete((request, response) => {
    const group = request.params['group'];
    const recipe = request.params['recipe'];

    const groupRecipe = database.collection(RootCollections.GROUPS).doc(group).collection(SubCollections.RECIPES).doc(recipe);

    groupRecipe.delete()
        .then(result => {
            response.status(200).send(`Recipe ${groupRecipe.id} unlinked from group ${group}`);
        })
        .catch(error => {
            response.status(400).send(`Failure unlinking recipe ${groupRecipe.id} from group ${group}`);
        });
});

/**
 * Gets a personal meal plan.
 */
server.route('/api/people/:person/plans/:plan').get((request, response) => {
    const person = request.params['person'];
    const plan = request.params['plan'];

    database.collection(RootCollections.PEOPLE).doc(person).collection(SubCollections.PLANS).doc(plan).get()
        .then(document => {
            if (document.exists) {
                response.status(200).send(document.data());
            } else {
                response.status(404).send(`Person ${person} does not contain plan ${plan}`)
            }
        })
        .catch(error => {
            response.status(400).send(`Error retrieving plan ${plan} from person ${person}`);
        });
});

