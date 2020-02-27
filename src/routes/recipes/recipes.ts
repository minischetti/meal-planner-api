import { server, database } from "../../index";
import { RootCollections, SubCollections } from "../../firebase/collections";
import { getDocumentsFromSnapshot } from "../../firebase/helpers";
import {
    MessageFactory,
    MessageFactoryPrimaryDomain,
    MessageFactorySecondaryDomain,
    MessageFactoryOperation,
    MessageFactoryResult
} from "../../utilities/MessageFactory";
import { RecipeValidationEngine } from "../../validation/RecipeValidationEngine";
import {
    Author,
    Recipe,
    EditedRecipe,
    RecipeUserRole,
    NewRecipeRequest
} from "../../models/index";
import { RecipePermissionEngine } from "../../permissions/RecipePermissionEngine";

/**
 * Gets all recipes.
 */
server.route("/api/recipes/").get((request, response) => {
    database
        .collection(RootCollections.RECIPES)
        .get()
        .then((snapshot: firebase.firestore.QuerySnapshot) => {
            if (snapshot.docs.length) {
                const recipes = getDocumentsFromSnapshot(snapshot.docs);

                response.status(200).send(recipes);
            } else {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.PLAN)
                    .setOperation(MessageFactoryOperation.GET)
                    .setResult(MessageFactoryResult.EMPTY);

                response.status(404).send(message);
            }
        })
        .catch((error: firebase.FirebaseError) => {
            response
                .status(400)
                .send(`Error getting recipes: ${error.message}`);
        });
});

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
        .then(document => {
            if (document.exists) {
                const recipe = document.data();
                recipeDocument
                    .collection(SubCollections.RECIPE_MEMBERS)
                    .get()
                    .then((snapshot: firebase.firestore.QuerySnapshot) => {
                        const recipeMembers = getDocumentsFromSnapshot(
                            snapshot.docs
                        );
                        const recipeWithMembers = {
                            ...recipe,
                            members: recipeMembers
                        };
                        response.status(200).send(recipeWithMembers);
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
 * Creates a new recipe.
 */
server.route("/api/recipes").post((request, response) => {
    const {
        profileId,
        name,
        prepTime,
        cookTime,
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
    const newRecipeDocument = database
        .collection(RootCollections.RECIPES)
        .doc();

    const newRecipe: NewRecipeRequest = {
        id: newRecipeDocument.id,
        name,
        prepTime,
        cookTime,
        ingredients,
        instructions
    };

    // Initiate a batch operation
    const batch = database.batch();

    // Queue the creation of the new recipe
    batch.set(newRecipeDocument, newRecipe);

    // Queue the addition of the author to the recipe's members
    const author = { id: profileId, role: RecipeUserRole.OWNER };
    batch.set(
        newRecipeDocument
            .collection(SubCollections.RECIPE_MEMBERS)
            .doc(profileId),
        author
    );

    // Queue the addition of the recipe to the author's profile
    batch.set(
        database
            .collection(RootCollections.PEOPLE)
            .doc(profileId)
            .collection(SubCollections.RECIPES)
            .doc(newRecipeDocument.id),
        { id: newRecipeDocument.id, role: author.role }
    );

    // Commit the batch operation for group creation and member additions
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

                canEditRecipe = members.some((member: Author) => {
                    return (
                        member.id === profileId &&
                        RecipePermissionEngine.canEditRecipe(member.role)
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
