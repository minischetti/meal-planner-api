import { server, database } from "../../index";
import {
    RootCollections,
    SubCollections,
    COLLECTION
} from "../../firebase/collections";
import {
    MessageFactory,
    MessageFactoryPrimaryDomain,
    MessageFactorySecondaryDomain,
    MessageFactoryOperation,
    MessageFactoryResult
} from "../../utilities/MessageFactory";
import {
    GroupDocumentData,
    GroupUser,
    GroupAssociation,
    SenderInvite,
    RecipientInvite,
    AddRecipeToGroupRequest,
    Association,
    NewGroupRequest
} from "../../models/index";
import { getDocumentsFromSnapshot } from "../../firebase/helpers";

/**
 * Creates a new group.
 */
server.route("/api/groups").post((request, response) => {
    const { name, description, profileId }: NewGroupRequest = request.body;

    if (!name || !profileId || !description) {
        return response.status(400).send();
    }

    // Create the global group document
    const groupDocument = database.collection(RootCollections.GROUPS).doc();

    // The group's id
    const groupDocumentId = groupDocument.id;

    // The group document's data
    const groupDocumentData: GroupDocumentData = {
        id: groupDocumentId,
        name,
        description,
        owner: profileId
    };

    // Create the user's group document
    const userGroupDocument = database
        .collection(COLLECTION.ROOT.PEOPLE)
        .doc(profileId)
        .collection(COLLECTION.SUB.PEOPLE.GROUPS)
        .doc(groupDocumentId);

    // The user's group document data
    const userGroupDocumentData = {
        id: groupDocumentId,
        association: GroupAssociation.OWNER
    };

    // Initiate a batch operation
    const batch = database.batch();

    // Queue the creation of the new global group document
    batch.set(groupDocument, groupDocumentData);

    // Queue the creation of the user's group document
    batch.set(userGroupDocument, userGroupDocumentData);

    // Commit the batch operation for group creation and member addition
    batch
        .commit()
        .then(() => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                .setOperation(MessageFactoryOperation.CREATE)
                .setResult(MessageFactoryResult.SUCCESS)
                .setData({ groupId: groupDocumentId });

            response.status(200).send(message);
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                .setOperation(MessageFactoryOperation.CREATE)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            response.status(400).send(message);
        });
});

/**
 * Gets all groups.
 */
server.route("/api/groups").get((request, response) => {
    database
        .collection(RootCollections.GROUPS)
        .get()
        .then((snapshot: firebase.firestore.QuerySnapshot) => {
            if (snapshot.docs.length) {
                const groups = getDocumentsFromSnapshot(snapshot.docs);

                response.status(200).send(groups);
            } else {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                    .setOperation(MessageFactoryOperation.GET)
                    .setResult(MessageFactoryResult.EMPTY);

                response.status(404).send(message);
            }
        })
        .catch((error: firebase.FirebaseError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                .setOperation(MessageFactoryOperation.GET)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            response.status(400).send(message);
        });
});

/**
 * Gets a specific group.
 */
server.route("/api/groups/:groupId").get((request, response) => {
    const groupId = request.params["groupId"];

    database
        .collection(RootCollections.GROUPS)
        .doc(groupId)
        .get()
        .then(document => {
            if (document.exists) {
                return response.status(200).send(document.data());
            } else {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                    .setOperation(MessageFactoryOperation.GET)
                    .setResult(MessageFactoryResult.EMPTY);
                return response.status(404).send(message);
            }
        });
});

/**
 * Gets a group's members.
 */
server.route("/api/groups/:groupId/members").get((request, response) => {
    const groupId = request.params["groupId"];

    database
        .collection(RootCollections.GROUPS)
        .doc(groupId)
        .collection(SubCollections.GROUP_MEMBERS)
        .get()
        .then(async (snapshot: firebase.firestore.QuerySnapshot) => {
            if (snapshot.docs.length) {
                const members = getDocumentsFromSnapshot(snapshot.docs);

                const memberDetails = await Promise.all(
                    // Map each member to a database operation, get the document if it exists, then combine role and member data
                    members.map(member => {
                        return database
                            .collection(RootCollections.PEOPLE)
                            .doc(member.id)
                            .get()
                            .then(document => {
                                if (document.exists) {
                                    return {
                                        role: member.role,
                                        ...document.data()
                                    };
                                }
                            });
                    })
                );

                return response.status(200).send(memberDetails);
            } else {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                    .setSecondaryDomain(
                        MessageFactorySecondaryDomain.GROUP_MEMBERS
                    )
                    .setOperation(MessageFactoryOperation.GET)
                    .setResult(MessageFactoryResult.EMPTY);
                return response.status(404).send(message);
            }
        })
        .catch((error: firebase.FirebaseError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                .setOperation(MessageFactoryOperation.GET)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            response.status(400).send(message);
        });
});

// const getRecipesFromGroup = async (groupId: string) => {
//     database
//         .collection(RootCollections.GROUPS)
//         .doc(groupId)
//         .collection(SubCollections.RECIPES)
//         .get()
//         .then(async (snapshot: firebase.firestore.QuerySnapshot) => {
//             if (snapshot.docs.length) {
//                 const recipes = getDocumentsFromSnapshot(snapshot.docs);

//                 const recipeDetails = await Promise.all(
//                     recipes.map(recipe => {
//                         database
//                             .collection(RootCollections.RECIPES)
//                             .doc(recipe.id)
//                             .get()
//                             .then(document => document.data());
//                     })
//                 );
//                 return recipeDetails;
//             }
//         });
// };

/**
 * Gets a group's recipes.
 */
server.route("/api/groups/:groupId/recipes").get((request, response) => {
    const groupId = request.params["groupId"];

    database
        .collection(RootCollections.GROUPS)
        .doc(groupId)
        .collection(SubCollections.RECIPES)
        .get()
        .then(async (snapshot: firebase.firestore.QuerySnapshot) => {
            if (snapshot.docs.length) {
                const recipes = getDocumentsFromSnapshot(snapshot.docs);

                const recipeDetails = await Promise.all(
                    recipes.map(recipe => {
                        database
                            .collection(RootCollections.RECIPES)
                            .doc(recipe.id)
                            .get()
                            .then(document => document.data());
                    })
                );

                return response.status(200).send(recipeDetails);
            } else {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                    .setSecondaryDomain(MessageFactorySecondaryDomain.RECIPES)
                    .setOperation(MessageFactoryOperation.GET)
                    .setResult(MessageFactoryResult.EMPTY);
                return response.status(404).send(message);
            }
        })
        .catch((error: firebase.FirebaseError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                .setSecondaryDomain(MessageFactorySecondaryDomain.RECIPES)
                .setOperation(MessageFactoryOperation.GET)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            response.status(400).send(message);
        });
});

/**
 * Gets a group's invites.
 */
server.route("/api/groups/:group/invites").get((request, response) => {
    const groupId = request.params["group"];

    database
        .collection(RootCollections.GROUPS)
        .doc(groupId)
        .collection(SubCollections.INVITES)
        .get()
        .then((snapshot: firebase.firestore.QuerySnapshot) => {
            if (snapshot.docs.length) {
                const invites = getDocumentsFromSnapshot(snapshot.docs);
                response.status(200).send(invites);
            } else {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                    .setSecondaryDomain(MessageFactorySecondaryDomain.INVITES)
                    .setOperation(MessageFactoryOperation.GET)
                    .setResult(MessageFactoryResult.EMPTY);

                response.status(404).send(message);
            }
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                .setSecondaryDomain(MessageFactorySecondaryDomain.INVITES)
                .setOperation(MessageFactoryOperation.GET)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            response.status(400).send(message);
        });
});

/**
 * Invites a user to a group.
 */
server.route("/api/groups/:group/invite").post((request, response) => {
    const group = request.params["group"];
    const { sender, recipient } = request.body;

    const groupInviteDocument = database
        .collection(RootCollections.GROUPS)
        .doc(group)
        .collection(SubCollections.INVITES)
        .doc();
    const inviteId = groupInviteDocument.id;
    const personInviteDocument = database
        .collection(RootCollections.PEOPLE)
        .doc(recipient)
        .collection(SubCollections.INVITES)
        .doc(inviteId);

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
    batch
        .commit()
        .then(() => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                .setSecondaryDomain(MessageFactorySecondaryDomain.INVITES)
                .setOperation(MessageFactoryOperation.CREATE)
                .setResult(MessageFactoryResult.SUCCESS)
                .setMessage(
                    `Invite to group ${group} sent to user ${recipient}`
                );

            response.status(200).send(message);
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                .setSecondaryDomain(MessageFactorySecondaryDomain.INVITES)
                .setOperation(MessageFactoryOperation.CREATE)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            response.status(400).send(message);
        });
});

/**
 * Gets all recipes from a group.
 */
server.route("/api/groups/:group/recipes/").get((request, response) => {
    const group = request.params["group"];

    const recipeCollectionReference = database
        .collection(RootCollections.GROUPS)
        .doc(group)
        .collection(SubCollections.RECIPES);

    recipeCollectionReference
        .get()
        .then((snapshot: firebase.firestore.QuerySnapshot) => {
            if (snapshot.docs.length) {
                const recipes = getDocumentsFromSnapshot(snapshot.docs);
                response.status(200).send(recipes);
            } else {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                    .setSecondaryDomain(MessageFactorySecondaryDomain.RECIPES)
                    .setOperation(MessageFactoryOperation.GET)
                    .setResult(MessageFactoryResult.EMPTY);

                response.status(404).send(message);
            }
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                .setSecondaryDomain(MessageFactorySecondaryDomain.RECIPES)
                .setOperation(MessageFactoryOperation.GET)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            response.status(400).send(message);
        });
});

/**
 * Links a recipe to a group.
 */
server.route("/api/groups/:group/recipes").post((request, response) => {
    const group = request.params["group"];
    const { recipeOwnerId, recipeId } = request.body;

    const recipeToAdd: AddRecipeToGroupRequest = {
        recipeOwnerId,
        recipeId
    };

    const newGroupRecipe = database
        .collection(RootCollections.GROUPS)
        .doc(group)
        .collection(SubCollections.RECIPES)
        .doc(recipeId);

    database.runTransaction(transaction => {
        return transaction
            .get(newGroupRecipe)
            .then(result => {
                if (result.exists) {
                    const message = new MessageFactory()
                        .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                        .setSecondaryDomain(
                            MessageFactorySecondaryDomain.RECIPES
                        )
                        .setOperation(MessageFactoryOperation.CREATE)
                        .setResult(MessageFactoryResult.ALREADY_EXISTS);

                    response.status(409).send(message);
                } else {
                    newGroupRecipe.set(recipeToAdd).then(() => {
                        const message = new MessageFactory()
                            .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                            .setSecondaryDomain(
                                MessageFactorySecondaryDomain.RECIPES
                            )
                            .setOperation(MessageFactoryOperation.CREATE)
                            .setResult(MessageFactoryResult.SUCCESS);

                        response.status(200).send(message);
                    });
                }
            })
            .catch((error: firebase.firestore.FirestoreError) => {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                    .setSecondaryDomain(MessageFactorySecondaryDomain.RECIPES)
                    .setOperation(MessageFactoryOperation.CREATE)
                    .setResult(MessageFactoryResult.ERROR)
                    .setMessage(error.message);

                response.status(400).send(message);
            });
    });
});

/**
 * Unlinks a recipe from a group.
 */
server
    .route("/api/groups/:group/recipes/:recipe")
    .delete((request, response) => {
        const group = request.params["group"];
        const recipe = request.params["recipe"];

        const groupRecipe = database
            .collection(RootCollections.GROUPS)
            .doc(group)
            .collection(SubCollections.RECIPES)
            .doc(recipe);

        groupRecipe
            .delete()
            .then(() => {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                    .setSecondaryDomain(MessageFactorySecondaryDomain.RECIPES)
                    .setOperation(MessageFactoryOperation.DELETE)
                    .setResult(MessageFactoryResult.SUCCESS);

                response.status(200).send(message);
            })
            .catch((error: firebase.firestore.FirestoreError) => {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.GROUP)
                    .setSecondaryDomain(MessageFactorySecondaryDomain.RECIPES)
                    .setOperation(MessageFactoryOperation.DELETE)
                    .setResult(MessageFactoryResult.ERROR)
                    .setMessage(error.message);

                response.status(400).send(message);
            });
    });
