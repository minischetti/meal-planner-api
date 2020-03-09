import { server, database } from "../../index";
import {
    RootCollections,
    SubCollections,
    COLLECTION
} from "../../firebase/collections";
import { getDocumentsFromSnapshot } from "../../firebase/helpers";
import {
    MessageFactory,
    MessageFactoryPrimaryDomain,
    MessageFactorySecondaryDomain,
    MessageFactoryOperation,
    MessageFactoryResult,
    MESSAGE_FACTORY_SECONDARY_DOMAIN
} from "../../utilities/MessageFactory";
import { RecipeValidationEngine } from "../../validation/RecipeValidationEngine";
import {
    Association,
    Recipe,
    EditedRecipe,
    RecipeAssociation,
    NewRecipeRequest
} from "../../models/index";
import { RecipePermissionEngine } from "../../permissions/RecipePermissionEngine";

// /**
//  * Gets all recipes.
//  */
// server.route("/api/recipes/").get((request, response) => {
//     database
//         .collection(RootCollections.RECIPES)
//         .get()
//         .then((snapshot: firebase.firestore.QuerySnapshot) => {
//             if (snapshot.docs.length) {
//                 const recipes = getDocumentsFromSnapshot(snapshot.docs);

//                 response.status(200).send(recipes);
//             } else {
//                 const message = new MessageFactory()
//                     .setPrimaryDomain(MessageFactoryPrimaryDomain.PLAN)
//                     .setOperation(MessageFactoryOperation.GET)
//                     .setResult(MessageFactoryResult.EMPTY);

//                 response.status(404).send(message);
//             }
//         })
//         .catch((error: firebase.FirebaseError) => {
//             response
//                 .status(400)
//                 .send(`Error getting recipes: ${error.message}`);
//         });
// });

/**
 * Gets a single recipe.
 */
server.route("/api/recipes/:recipe/").get((request, response) => {
    const recipe = request.params["recipe"];
    const recipeDocument = database
        .collection(RootCollections.RECIPES)
        .doc(recipe);

    recipeDocument
        .get()
        .then(async document => {
            if (document.exists) {
                const recipe = document.data();

                const associations = await recipeDocument
                    .collection(COLLECTION.SUB.RECIPES.ASSOCIATIONS)
                    .get()
                    .then((snapshot: firebase.firestore.QuerySnapshot) => {
                        return getDocumentsFromSnapshot(snapshot.docs);
                    });

                return response.status(200).send({
                    ...recipe,
                    associations
                });
            }
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.PEOPLE)
                .setSecondaryDomain(MessageFactorySecondaryDomain.RECIPES)
                .setOperation(MessageFactoryOperation.GET)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            response.status(400).send(message);
        });
});

/**
 * Gets a person's recipes.
 */
server.route("/api/people/:person/recipes").get((request, response) => {
    const person = request.params["person"];

    database
        .collection(RootCollections.PEOPLE)
        .doc(person)
        .collection(SubCollections.RECIPES)
        .get()
        .then((snapshot: firebase.firestore.QuerySnapshot) => {
            if (snapshot.docs.length) {
                const recipes = getDocumentsFromSnapshot(snapshot.docs);

                const recipeDocuments = recipes.map((recipe: any) =>
                    database
                        .collection(SubCollections.RECIPES)
                        .doc(recipe.id)
                        .get()
                );

                Promise.all([...recipeDocuments]).then((documents: any) => {
                    const recipes = documents
                        .map(
                            (document: firebase.firestore.DocumentSnapshot) => {
                                if (document.exists) {
                                    return document.data();
                                }
                            }
                        )
                        .filter((recipe: Recipe) => recipe);

                    response.status(200).send(recipes);
                });
            } else {
                response
                    .status(404)
                    .send(`Person ${person} does not have any recipes`);
            }
        })
        .catch((error: firebase.FirebaseError) => {
            response
                .status(400)
                .send(`Error getting recipes from ${person}: ${error.message}`);
        });
});

/**
 * Adds an association to a recipe.
 */
server
    .route("/api/recipes/:recipeId/associations")
    .post(async (request, response) => {
        const recipeId = request.params["recipeId"];
        const { profileId, association } = request.body;

        if (!profileId || !association) {
            return response.status(400).send();
        }

        // Get the profile document
        const profileDocument = database
            .collection(COLLECTION.ROOT.PEOPLE)
            .doc(profileId);

        // If the profile document doesn't exist, abort
        if (!(await profileDocument.get()).exists) {
            return response.status(404).send("profile doesn't exist");
        }

        // Get the recipe document
        const recipeDocument = database
            .collection(COLLECTION.ROOT.RECIPES)
            .doc(recipeId);

        // If the recipe document doesn't exist, abort
        if (!(await recipeDocument.get()).exists) {
            return response.status(404).send("recipe doesn't exist");
        }

        // Initialize the batch operation
        const batch = database.batch();

        // Get the user's recipe reference document
        const profileRecipeDocument = profileDocument
            .collection(COLLECTION.SUB.PEOPLE.RECIPES)
            .doc(recipeId);

        // Queue the user's document update
        batch.set(profileRecipeDocument, {
            id: recipeId,
            association
        });

        // Get the recipe's document referencing the user
        const recipeAssociationDocument = recipeDocument
            .collection(COLLECTION.SUB.RECIPES.ASSOCIATIONS)
            .doc(profileId);

        // Queue the recipe document update
        batch.set(recipeAssociationDocument, { id: profileId, association });

        // Batch commit the updates
        batch
            .commit()
            .then(() => {
                return response.status(200).send();
            })
            .catch((error: firebase.firestore.FirestoreError) => {
                return response.status(400).send();
            });
    });

/**
 * Deletes an association from a recipe.
 */
server
    .route("/api/recipes/:recipeId/associations/:profileId")
    .delete(async (request, response) => {
        const recipeId = request.params["recipeId"];
        const profileId = request.params["profileId"];

        if (!profileId) {
            return response.status(400).send();
        }

        // Get the profile document
        const profileDocument = database
            .collection(COLLECTION.ROOT.PEOPLE)
            .doc(profileId);

        // If the profile document doesn't exist, abort
        if (!(await profileDocument.get()).exists) {
            return response.status(404).send("profile doesn't exist");
        }

        // Get the recipe document
        const recipeDocument = database
            .collection(COLLECTION.ROOT.RECIPES)
            .doc(recipeId);

        // If the recipe document doesn't exist, abort
        if (!(await recipeDocument.get()).exists) {
            return response.status(404).send("recipe doesn't exist");
        }

        const recipeAssociationDocument = recipeDocument
            .collection(COLLECTION.SUB.RECIPES.ASSOCIATIONS)
            .doc(profileId);

        // If the user is not already associated with this recipe, abort
        if (!(await recipeAssociationDocument.get()).exists) {
            return response
                .status(400)
                .send("user is not already associated with this recipe");
        }

        // Initialize the batch operation
        const batch = database.batch();

        // Get the user's recipe reference document
        const profileRecipeDocument = profileDocument
            .collection(COLLECTION.SUB.PEOPLE.RECIPES)
            .doc(recipeId);

        // Queue the user's document update
        batch.delete(profileRecipeDocument);

        // Queue the recipe document update
        batch.delete(recipeAssociationDocument);

        // Batch commit the updates
        batch
            .commit()
            .then(() => {
                response.status(200).send();
            })
            .catch((error: firebase.firestore.FirestoreError) => {
                response.status(400).send();
            });
    });

/**
 * Creates a new recipe.
 */
server.route("/api/recipes").post((request, response) => {
    const {
        profileId,
        name,
        prepTime,
        cookTime,
        recipeYield,
        description,
        ingredients,
        instructions
    } = request.body;

    const validName = RecipeValidationEngine.validateName(name);
    const validIngredients = RecipeValidationEngine.validateIngredients(
        ingredients
    );
    const validInstructions = RecipeValidationEngine.validateInstructions(
        instructions
    );

    if (
        !profileId ||
        !prepTime ||
        !cookTime ||
        !validName ||
        !recipeYield ||
        !description ||
        !validIngredients ||
        !validInstructions
    ) {
        const message = new MessageFactory()
            .setPrimaryDomain(MessageFactoryPrimaryDomain.PEOPLE)
            .setSecondaryDomain(MessageFactorySecondaryDomain.RECIPES)
            .setOperation(MessageFactoryOperation.CREATE)
            .setResult(MessageFactoryResult.ERROR);

        return response.status(400).send(message);
    }

    // Input is valid, so create a document for the new recipe
    const globalRecipeDocument = database
        .collection(RootCollections.RECIPES)
        .doc();

    const newRecipeData: NewRecipeRequest = {
        id: globalRecipeDocument.id,
        owner: profileId,
        name,
        prepTime,
        cookTime,
        recipeYield,
        description,
        ingredients,
        instructions
    };

    const userRecipeDocument = database
        .collection(RootCollections.PEOPLE)
        .doc(profileId)
        .collection(SubCollections.RECIPES)
        .doc(globalRecipeDocument.id);

    const userRecipeAssociationData: Association = {
        id: globalRecipeDocument.id,
        association: RecipeAssociation.OWNER
    };
    // Initiate a batch operation
    const batch = database.batch();

    // Queue the creation of the new recipe in the recipe collection
    batch.set(globalRecipeDocument, newRecipeData);

    // Queue the addition of the recipe to the author's recipe collection
    batch.set(userRecipeDocument, userRecipeAssociationData);

    // Commit the batch operation recipe creation
    batch
        .commit()
        .then(() => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.PEOPLE)
                .setSecondaryDomain(MessageFactorySecondaryDomain.RECIPES)
                .setOperation(MessageFactoryOperation.CREATE)
                .setResult(MessageFactoryResult.SUCCESS);

            response.status(200).send(message);
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.PEOPLE)
                .setSecondaryDomain(MessageFactorySecondaryDomain.RECIPES)
                .setOperation(MessageFactoryOperation.CREATE)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            response.status(400).send(message);
        });
});

/**
 * Updates a recipe.
 *
 */
server.route("/api/recipes/:recipeId").put((request, response) => {
    const {
        profileId,
        name,
        prepTime,
        cookTime,
        authors,
        ingredients,
        instructions
    } = request.body;
    const recipeId = request.params["recipeId"];

    const isValidName = RecipeValidationEngine.validateName(name);
    // const areValidAuthors = RecipeValidationEngine.validateAuthors(authors);
    const areValidAuthors = true;
    const areValidIngredients = RecipeValidationEngine.validateIngredients(
        ingredients
    );
    const areValidInstructions = RecipeValidationEngine.validateInstructions(
        instructions
    );

    if (!profileId) {
        const message = new MessageFactory()
            .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
            .setResult(MessageFactoryResult.BAD_REQUEST);

        return response.status(400).send(message);
    }

    if (!isValidName) {
        const message = new MessageFactory()
            .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
            .setSecondaryDomain(MessageFactorySecondaryDomain.NAME)
            .setResult(MessageFactoryResult.BAD_REQUEST);

        return response.status(400).send(message);
    }

    if (!areValidAuthors) {
        const message = new MessageFactory()
            .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
            .setSecondaryDomain(MessageFactorySecondaryDomain.AUTHORS)
            .setResult(MessageFactoryResult.BAD_REQUEST);

        return response.status(400).send(message);
    }

    if (!areValidIngredients) {
        const message = new MessageFactory()
            .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
            .setSecondaryDomain(MessageFactorySecondaryDomain.INGREDIENTS)
            .setResult(MessageFactoryResult.BAD_REQUEST);

        return response.status(400).send(message);
    }

    if (!areValidInstructions) {
        const message = new MessageFactory()
            .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
            .setSecondaryDomain(MessageFactorySecondaryDomain.INSTRUCTIONS)
            .setResult(MessageFactoryResult.BAD_REQUEST);

        return response.status(400).send(message);
    }

    const editedRecipe: EditedRecipe = {
        id: recipeId,
        name,
        prepTime,
        cookTime,
        ingredients,
        instructions
    };

    database.collection(RootCollections.RECIPES).doc(recipeId);

    let canEditRecipe = false;

    const recipeDocument = database
        .collection(RootCollections.RECIPES)
        .doc(recipeId);

    recipeDocument
        .collection(SubCollections.RECIPE_MEMBERS)
        .get()
        .then((snapshot: firebase.firestore.QuerySnapshot) => {
            if (snapshot.docs.length) {
                const members = getDocumentsFromSnapshot(snapshot.docs);

                canEditRecipe = members.some((member: Association) => {
                    return (
                        member.id === profileId &&
                        RecipePermissionEngine.canEditRecipe(member.association)
                    );
                });

                if (!canEditRecipe) {
                    const message = new MessageFactory()
                        .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
                        .setOperation(MessageFactoryOperation.UPDATE)
                        .setResult(MessageFactoryResult.PERMISSION_DENY);

                    return response.status(400).send(message);
                }
            }
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
                .setOperation(MessageFactoryOperation.UPDATE)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            return response.status(400).send(message);
        });

    // TODO: Support updating relevant documents when authors are modified.
    recipeDocument
        .set(editedRecipe)
        .then(() => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
                .setOperation(MessageFactoryOperation.UPDATE)
                .setResult(MessageFactoryResult.SUCCESS);

            return response.status(200).send(message);
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
                .setOperation(MessageFactoryOperation.UPDATE)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            return response.status(400).send(message);
        });
});

/**
 * Deletes an existing recipe.
 */
server
    .route("/api/people/:person/recipes/:recipe")
    .delete((request, response) => {
        const person = request.params["person"];
        const recipe = request.params["recipe"];

        const recipeDocumentFromPerson = database
            .collection(RootCollections.PEOPLE)
            .doc(person)
            .collection(SubCollections.RECIPES)
            .doc(recipe);
        const recipeDocumentFromGlobalCollection = database
            .collection(RootCollections.RECIPES)
            .doc(recipe);

        // Initiate a batch operation
        const batch = database.batch();

        // Queue the deletion of a person's recipe
        batch.delete(recipeDocumentFromPerson);

        // Queue the deletion of the recipe from the global recipe collection
        batch.delete(recipeDocumentFromGlobalCollection);

        // Commit the batch operation for group creation and member addition
        batch
            .commit()
            .then(() => {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
                    .setOperation(MessageFactoryOperation.DELETE)
                    .setResult(MessageFactoryResult.SUCCESS);

                response.status(200).send(message);
            })
            .catch((error: firebase.firestore.FirestoreError) => {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
                    .setOperation(MessageFactoryOperation.DELETE)
                    .setResult(MessageFactoryResult.ERROR)
                    .setMessage(error.message);

                response.status(400).send(message);
            });
    });

// /**
//  * Favorites a recipe.
//  */
// server.route("/api/recipes/:recipeId/favorite").post((request, response) => {
//     const recipeId = request.params["recipeId"];
//     const { userId, favoriteStatus } = request.body;

//     const recipeDocument = database
//         .collection(COLLECTION.ROOT.RECIPES)
//         .doc(recipeId)
//         .collection(COLLECTION.SUB.RECIPES.FAVORITES)
//         .doc(userId)

//     const userDocument = database
//         .collection(COLLECTION.ROOT.PEOPLE)
//         .doc(userId)
//         .collection(COLLECTION.SUB.PEOPLE.FAVORITES)
//         .doc(recipeId)

//     // Initiate a batch operation
//     const batch = database.batch();

//     // Update the group's invite with the answer and inactive status
//     const {id: userId, role: RecipeUserRole.S}
//     batch.set(recipeDocument, {})

//     // Update the recipient's invite with the answer and inactive status
//     batch.update(recipientInviteDocument, inviteResponse);

//     // If the recipient has accepted the invite, add them to the group
//     if (answer === true) {
//         batch.set(groupMemberCollection.doc(person), {
//             id: person,
//             status: GroupUserRole.MEMBER
//         });
//     }

//     // Batch commit updates to the group and person's invites, then add the person to the group if the invite was accepted
//     batch
//         .commit()
//         .then(() => {
//             const message = new MessageFactory()
//                 .setPrimaryDomain(MessageFactoryPrimaryDomain.PEOPLE)
//                 .setSecondaryDomain(MessageFactorySecondaryDomain.INVITES)
//                 .setOperation(MessageFactoryOperation.UPDATE)
//                 .setResult(MessageFactoryResult.SUCCESS)
//                 .setMessage(`Person ${person} added to group ${group}`);

//             response.status(200).send(message);
//         })
//         .catch((error: firebase.firestore.FirestoreError) => {
//             const message = new MessageFactory()
//                 .setPrimaryDomain(MessageFactoryPrimaryDomain.PEOPLE)
//                 .setSecondaryDomain(MessageFactorySecondaryDomain.INVITES)
//                 .setOperation(MessageFactoryOperation.UPDATE)
//                 .setResult(MessageFactoryResult.ERROR)
//                 .setMessage(error.message);

//             response.status(400).send(message);
//         });
// });
