import { server, database } from "../../index";
import { RootCollections, SubCollections } from "../../firebase/collections";
import { getDocumentsFromSnapshot } from "../../firebase/helpers";
import { MessageFactory, MessageFactoryPrimaryDomain, MessageFactorySecondaryDomain, MessageFactoryOperation, MessageFactoryResult } from "../../utilities/MessageFactory";
import { RecipeValidationEngine } from "../../validation/RecipeValidationEngine";
import { Author, Instruction, Ingredient } from "../../models/index";
import { updateRecipe } from "./helpers";

/**
 * Gets all recipes.
 */
server.route('/api/recipes/').get((request, response) => {
    database.collection(RootCollections.RECIPES).get()
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
            response.status(400).send(`Error getting recipes: ${error.message}`);
        });
});

/**
 * Gets a single recipe.
 */
server.route('/api/recipes/:recipe/').get((request, response) => {
    const recipe = request.params['recipe'];
    const recipeDocument = database.collection(RootCollections.RECIPES).doc(recipe);

    // database.collection(RootCollections.RECIPES).doc(recipe).get()
    //     .then((document: firebase.firestore.QueryDocumentSnapshot) => {
    //         if (document.exists) {
    //             response.status(200).send(document.data());
    //         } else {
    //             response.status(404).send("Recipe not found")
    //         }
    //     })
    //     .catch((error: firebase.FirebaseError) => {
    //         response.status(400).send(`Error getting recipe ${recipe}: ${error.message}`);
    //     });

    recipeDocument.get()
        .then(document => {
            if (document.exists) {
                const recipe = document.data();
                recipeDocument.collection(SubCollections.RECIPE_MEMBERS).get()
                    .then((snapshot: firebase.firestore.QuerySnapshot) => {
                        const recipeMembers = getDocumentsFromSnapshot(snapshot.docs);
                        const recipeWithMembers = { ...recipe, members: recipeMembers };
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
server.route('/api/people/:person/recipes').get((request, response) => {
    const person = request.params['person'];

    database.collection(RootCollections.PEOPLE).doc(person).collection(SubCollections.RECIPES).get()
        .then((snapshot: firebase.firestore.QuerySnapshot) => {
            if (snapshot.docs.length) {
                const recipes = getDocumentsFromSnapshot(snapshot.docs);

                const recipeDocuments = recipes.map((recipe: any) => database.collection(SubCollections.RECIPES).doc(recipe.id).get());

                Promise.all([...recipeDocuments])
                    .then((documents: any) => {
                        const recipes = documents.map((document: firebase.firestore.DocumentSnapshot) => {
                            if (document.exists) {
                                return document.data();
                            }
                        });

                        response.status(200).send(recipes);
                    })
            } else {
                response.status(404).send(`Person ${person} does not have any recipes`);
            }
        })
        .catch((error: firebase.FirebaseError) => {
            response.status(400).send(`Error getting recipes from ${person}: ${error.message}`);
        });
});

/**
 * Edits a recipe's name.
 *
 */
server.route('/api/recipes/:recipe/name').put((request, response) => {
    const { name } = request.body;

    const newRecipeName = {
        name: name as string
    }

    return updateRecipe(request, response, newRecipeName);
});

/**
 * Edits a recipe's authors.
 *
 */
server.route('/api/recipes/:recipe/authors').put((request, response) => {
    const { authors } = request.body;

    const newRecipeAuthors = {
        authors: authors as Array<Author>
    }

    const validAuthors = RecipeValidationEngine.validateAuthors(authors);

    if (!validAuthors) {
        const message = new MessageFactory()
            .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
            .setSecondaryDomain(MessageFactorySecondaryDomain.AUTHORS)
            .setResult(MessageFactoryResult.BAD_REQUEST)

        return response.status(400).send(message);
    }

    updateRecipe(request, response, newRecipeAuthors);
});

/**
 * Edits a recipe's instructions.
 *
 */
server.route('/api/recipes/:recipe/instructions').put((request, response) => {
    const { instructions } = request.body;

    const newRecipeInstructions = {
        instructions: instructions as Array<Instruction>
    }

    const validInstructions = RecipeValidationEngine.validateInstructions(instructions);

    if (!validInstructions) {
        const message = new MessageFactory()
            .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
            .setSecondaryDomain(MessageFactorySecondaryDomain.INSTRUCTIONS)
            .setResult(MessageFactoryResult.BAD_REQUEST)

        return response.status(400).send(message);
    }

    updateRecipe(request, response, newRecipeInstructions);
});


/**
 * Edits a recipe's ingredients.
 *
 */
server.route('/api/recipes/:recipe/ingredients').put((request, response) => {
    const { ingredients } = request.body;

    const newRecipeIngredients = {
        ingredients: ingredients as Array<Ingredient>
    }

    const validIngredients = RecipeValidationEngine.validateIngredients(ingredients);

    if (!validIngredients) {
        const message = new MessageFactory()
            .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
            .setSecondaryDomain(MessageFactorySecondaryDomain.INGREDIENTS)
            .setResult(MessageFactoryResult.BAD_REQUEST)

        return response.status(400).send(message);
    }

    updateRecipe(request, response, newRecipeIngredients);
});

/**
 * Deletes an existing recipe.
 */
server.route('/api/people/:person/recipes/:recipe').delete((request, response) => {
    const person = request.params['person'];
    const recipe = request.params['recipe'];

    const recipeDocumentFromPerson = database.collection(RootCollections.PEOPLE).doc(person).collection(SubCollections.RECIPES).doc(recipe);
    const recipeDocumentFromGlobalCollection = database.collection(RootCollections.RECIPES).doc(recipe);

    // Initiate a batch operation
    const batch = database.batch();

    // Queue the deletion of a person's recipe
    batch.delete(recipeDocumentFromPerson);

    // Queue the deletion of the recipe from the global recipe collection
    batch.delete(recipeDocumentFromGlobalCollection);

    // Commit the batch operation for group creation and member addition
    batch.commit()
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
