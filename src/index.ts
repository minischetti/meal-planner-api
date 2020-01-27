import express, {Request, Response, response} from "express";
import {GroupUserRole, RecipeUserRole} from "./models/roles";
import {Profile, Recipe, Group, SourceInvite as SenderInvite, ReceivingInvite as RecipientInvite, GroupUser, Plan, PlanDay, Author, Instruction, Ingredient} from "./models/data-types";
import {NewPersonAccountRequest, NewPersonProfileRequest, NewRecipeRequest, NewGroupRequest, GroupInviteResponseRequest, AddRecipeToGroupRequest, NewMealPlanRequest, EditedRecipeRequest} from "./models/request-bodies"
import {SubCollections, RootCollections} from "./firebase/collections";
import {MessageFactory, MessageFactoryPrimaryDomain, MessageFactorySecondaryDomain, MessageFactoryOperation, MessageFactoryResult} from "./utilities/MessageFactory"

// Firebase App (the core Firebase SDK) is always required and
// must be listed before other Firebase SDKs
import * as firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import "firebase/database";

// Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyC04nIaIwTas102iVvPRXztqHQlVyz9IWs",
    authDomain: "meal-planner-6988e.firebaseapp.com",
    databaseURL: "https://meal-planner-6988e.firebaseio.com",
    projectId: "meal-planner-6988e",
    storageBucket: "meal-planner-6988e.appspot.com",
    messagingSenderId: "357922540060",
    appId: "1:357922540060:web:e3bb498301fa3abe222dd9",
    measurementId: "G-HFWT5CMFZ1"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Database
const database: firebase.firestore.Firestore = !firebase.apps.length ? firebase.initializeApp(firebaseConfig).firestore() : firebase.firestore();

// Express
const server = express();
const listenPort = 8000;

server.listen(listenPort, () => {
    console.log(`Meal Planner API listening on port ${listenPort}`);
});

server.use(express.json());

/**
 * Creates a new user.
 */
server.route('/api/people/accounts').post((request: Request, response: any) => {
    const {email, password} = request.body;

    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((firebaseResponse: any) => {
            response.status(200).send(firebaseResponse);
        })
        .catch((error: any) => {
            response.status(400).send(error);
        });
});

/**
 * Creates a new profile.
 */
server.route('/api/people/profiles').post((request: Request, response: any) => {
    const {id, firstName, lastName} = request.body;

    const newUser: NewPersonProfileRequest = {
        id,
        firstName,
        lastName
    }

    database.collection(RootCollections.PEOPLE).doc(id).set(newUser)
        .then((firebaseResponse: any) => {
            response.status(200).send(`Profile created for person ${id}`);
        })
        .catch((error: any) => {
            response.status(400).send(`Error creating profile for person ${id}`);
        });
});

/**
 * Logs a user in.
 */
server.route('/api/login').post((request: Request, response: any) => {
    const {email, password} = request.body;

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((firebaseResponse: any) => {
            response.status(200).send(`Successfully signed in`);
        })
        .catch((error: firebase.FirebaseError) => {
            response.status(400).send(`Error signing in: ${error.message}`);
        });
});

/**
 * Logs a user out.
 */
server.route('/api/logout').post((request: Request, response: any) => {
    firebase.auth().signOut()
    .then((firebaseResponse: any) => {
        response.status(200).send("Successfully logged out")
    })
    .catch((error: firebase.FirebaseError) => {
        response.status(400).send(`Error logging out: ${error.message}`);
    });
});

/**
 * Gets a person.
 */
server.route('/api/people/:person/').get((request, response) => {
    const person = request.params['person'];

    database.collection(RootCollections.PEOPLE).doc(person).get()
        .then((document: any) => {
            if (document.exists) {
                response.status(200).send(document.data());
            } else {
                response.status(404).send(`Person ${person} does not exist`);
            }
        })
        .catch((error: firebase.FirebaseError) => {
            response.status(400).send(`Error getting person ${person}: ${error.message}`);
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
                const recipes = snapshot.docs.map((recipe: firebase.firestore.QueryDocumentSnapshot) => recipe.data());

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
 * Gets all recipes.
 */
server.route('/api/recipes/').get((request, response) => {
    database.collection(RootCollections.RECIPES).get()
        .then((snapshot: any) => {
            if (snapshot.docs.length) {
                const recipes = snapshot.docs.map((recipe: firebase.firestore.QueryDocumentSnapshot) => recipe.data());

                response.status(200).send(recipes);
            } else {
                response.status(404).send("Recipes not found")
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

    database.collection(RootCollections.RECIPES).doc(recipe).get()
        .then((document: any) => {
            if (document.exists) {
                response.status(200).send(document.data());
            } else {
                response.status(404).send("Recipe not found")
            }
        })
        .catch((error: firebase.FirebaseError) => {
            response.status(400).send(`Error getting recipe ${recipe}: ${error.message}`);
        });
});


// /**
//  * Gets a recipe from a person.
//  */
// server.route('/api/people/:person/recipes/:recipe').get((request, response) => {
//     const person = request.params['person'];
//     const recipe = request.params['recipe'];

//     database.collection(RootCollections.RECIPES).doc(recipe).get()
//         .then((document: any) => {
//             if (document.exists) {
//                 response.status(200).send(document.data());
//             } else {
//                 response.status(404).send("Recipe not found")
//             }
//         })
//         .catch((error: firebase.FirebaseError) => {
//             response.status(400).send(`Error getting recipe ${recipe} from person ${person}: ${error.message}`);
//         });
// });

/**
 * Adds a new recipe to a person.
 */
server.route('/api/people/:person/recipes').post((request, response) => {
    const person = request.params['person'];
    const {name, ingredients, instructions} = request.body;
    const members = [{id: person, role: RecipeUserRole.OWNER}];

    const newRecipeDocument = database.collection(RootCollections.RECIPES).doc();

    const newRecipe: NewRecipeRequest = {
        id: newRecipeDocument.id,
        name,
        ingredients,
        instructions
    };

    // Initiate a batch operation
    const batch = database.batch();

    // Queue the creation of a new group
    batch.set(newRecipeDocument, newRecipe);

    // Queue the addition of each member to the group
    if (members.length) {
        members.forEach((author: Author) => {
            batch.set(newRecipeDocument.collection(SubCollections.RECIPE_MEMBERS).doc(author.id), author);
        });
    }

    // Commit the batch operation for group creation and member additions
    batch.commit()
        .then(() => {
            response.status(200).send(`Recipe ${newRecipeDocument.id} successfully created`);
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            response.status(400).send(`Error creating new recipe: ${error.message}`);
        });
});

/**
 * Edits a recipe's name.
 *
 */
server.route('/api/recipes/:recipe/name').put((request, response) => {
    const {name} = request.body;

    const newRecipeName = {
        name: name as string
    }

    updateRecipe(request, response, newRecipeName);
});

/**
 * Edits a recipe's authors.
 *
 */
server.route('/api/recipes/:recipe/authors').put((request, response) => {
    const {authors} = request.body;

    const newRecipeAuthors = {
        authors: authors as Array<Author>
    }

    updateRecipe(request, response, newRecipeAuthors);
});

/**
 * Edits a recipe's instructions.
 *
 */
server.route('/api/recipes/:recipe/instructions').put((request, response) => {
    const {instructions} = request.body;

    const newRecipeInstructions = {
        instructions: instructions as Array<Instruction>
    }

    updateRecipe(request, response, newRecipeInstructions);
});


/**
 * Edits a recipe's ingredients.
 *
 */
server.route('/api/recipes/:recipe/ingredients').put((request, response) => {
    const {ingredients} = request.body;

    const newRecipeIngredients = {
        ingredients: ingredients as Array<Ingredient>
    }

    updateRecipe(request, response, newRecipeIngredients);
});

/**
 * Determines if a user can edit a recipe based on their role.
 *
 * @param {RecipeUserRole} memberRole the member's role
 * @returns {boolean} whether or not the member can edit a recipe
 */
function canEditRecipe(memberRole: RecipeUserRole) {
    return memberRole === RecipeUserRole.OWNER || memberRole === RecipeUserRole.CONTRIBUTOR;
}

/**
 * Updates a recipe with the given data.
 * @param request the request
 * @param response the response
 * @param newData the new recipe data
 */
function updateRecipe(request: Request, response: Response, newData: any) {
    const recipe = request.params['recipe'];
    const {personId} = request.body;

    if (!personId || !newData) {
        const message = new MessageFactory()
            .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
            .setResult(MessageFactoryResult.BAD_REQUEST)

        response.status(400).send(message);
    }

    const recipeDocument = database.collection(RootCollections.RECIPES).doc(recipe);

    recipeDocument.get()
        .then(result => {
            if (result.exists) {
                const recipeMemberCollection = recipeDocument.collection(SubCollections.RECIPE_MEMBERS);
                const recipeMemberDocument = recipeMemberCollection.doc(personId);

                recipeMemberDocument.get()
                    .then(result => {
                        const memberDetails = result.data();
                        const memberRole = memberDetails.role;

                        if (canEditRecipe(memberRole)) {
                            if (newData.authors) {
                                if (!newData.authors.length) {
                                    const message = new MessageFactory()
                                        .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
                                        .setSecondaryDomain(MessageFactorySecondaryDomain.AUTHORS)
                                        .setResult(MessageFactoryResult.BAD_REQUEST)

                                    response.send(400).send(message);
                                } else {
                                    // Initiate a batch operation
                                    const batch = database.batch();

                                    // Map each author to their respective document and queue an update
                                    newData.authors.map((author: Author) => {
                                        const authorDocument = recipeMemberCollection.doc(author.id);
                                        batch.set(authorDocument, author);
                                    });

                                    // Commit the batch operation
                                    batch.commit()
                                        .then(() => {
                                            const message = new MessageFactory()
                                                .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
                                                .setSecondaryDomain(MessageFactorySecondaryDomain.AUTHORS)
                                                .setOperation(MessageFactoryOperation.UPDATE)
                                                .setResult(MessageFactoryResult.SUCCESS);

                                            response.status(200).send(message);
                                        })
                                }
                            } else {
                                recipeDocument.update(newData)
                                    .then(() => {
                                        const message = new MessageFactory()
                                            .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
                                            .setSecondaryDomain(MessageFactorySecondaryDomain.AUTHORS)
                                            .setOperation(MessageFactoryOperation.UPDATE)
                                            .setResult(MessageFactoryResult.SUCCESS);

                                        response.status(200).send(message);
                                    })
                            }

                        } else {
                            const message = new MessageFactory()
                                .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
                                .setSecondaryDomain(MessageFactorySecondaryDomain.AUTHORS)
                                .setOperation(MessageFactoryOperation.UPDATE)
                                .setResult(MessageFactoryResult.PERMISSION_DENY);

                            response.status(403).send(message);
                        }
                    });
            } else {
                response.status(404).send(`Recipe ${recipe} doesn't exist`);
            }
        }).catch((error: firebase.firestore.FirestoreError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
                .setSecondaryDomain(MessageFactorySecondaryDomain.AUTHORS)
                .setOperation(MessageFactoryOperation.UPDATE)
                .setResult(MessageFactoryResult.ERROR)
                .setErrorMessage(error.message);

            response.status(400).send(message);
        });
}

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
                .setErrorMessage(error.message);

            response.status(400).send(message);
        });
});

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
 * Responds to an invite.
 */
server.route('/api/people/:person/invites/:invite').post((request, response) => {
    const person = request.params['person'];
    const invite = request.params['invite'];
    const {group, answer} = request.body;

    const inviteResponse = {
        answer,
        active: false
    }

    const groupInviteCollection = database.collection(RootCollections.GROUPS).doc(group).collection(SubCollections.INVITES);
    const groupMemberCollection = database.collection(RootCollections.GROUPS).doc(group).collection(SubCollections.GROUP_MEMBERS);
    const groupInviteDocument = groupInviteCollection.doc(invite);

    const recipientInviteCollection = database.collection(RootCollections.PEOPLE).doc(person).collection(SubCollections.INVITES);
    const recipientInviteDocument = recipientInviteCollection.doc(invite);

    // Initiate a batch operation
    const batch = database.batch();

    // Update the group's invite with the answer and inactive status
    batch.update(groupInviteDocument, inviteResponse);

    // Update the recipient's invite with the answer and inactive status
    batch.update(recipientInviteDocument, inviteResponse);

    // If the recipient has accepted the invite, add them to the group
    if (answer === true) {
        batch.set(groupMemberCollection.doc(person), {id: person, status: GroupUserRole.MEMBER});
    }

    // Batch commit updates to the group and person's invites, then add the person to the group if the invite was accepted
    batch.commit()
        .then(() => {
            response.status(200).send(`Person ${person} added to group ${group}`);
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            response.status(400).send(error);
        });
});

// /**
//  * Gets a recipe from a group.
//  */
// server.route('/api/groups/:group/recipes/:recipe').get((request, response) => {
//     const group = request.params['group'];
//     const recipe = request.params['recipe'];
//     const recipeReference = database.collection(RootCollections.RECIPES).doc(recipe);

//     recipeReference.get()
//         .then(document => {
//             if (document.exists) {
//                 response.status(200).send(document.data());
//             } else {
//                 response.status(404).send(`Recipe ${recipe} does not exist in group ${group}`)
//             }
//         })
//         .catch(error => {
//             response.status(400).send(`Error retrieving recipe ${recipe} from group ${group}`);
//         });
// });

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


/**
 * Gets all personal meal plans.
 */
server.route('/api/people/:person/plans/').get((request, response) => {
    const person = request.params['person'];

    database.collection(RootCollections.PEOPLE).doc(person).collection(SubCollections.PLANS).get()
        .then((snapshot: firebase.firestore.QuerySnapshot) => {
            if (snapshot.docs.length) {
                const plans = snapshot.docs.map((document: any) => document.data());
                response.status(200).send(plans);
            } else {
                response.status(404).send(`Person ${person} does not have any meal plans`);
            }
        })
        .catch((error: any) => {
            console.log(error);
            response.status(400).send(error);
        });
});

/**
 * Creates a personal meal plan.
 */
server.route('/api/people/:person/plans').post((request, response) => {
    const person = request.params['person'];
    const {name, days} = request.body;

    const newMealPlanDocument = database.collection(RootCollections.PEOPLE).doc(person).collection(SubCollections.PLANS).doc();

    const newMealPlan: NewMealPlanRequest = {
        name,
        id: newMealPlanDocument.id,
        days
    };

    newMealPlanDocument.set(newMealPlan)
        .then((firebaseResponse: any) => {
            response.status(200).send(`New meal plan created with id: ${newMealPlanDocument.id}`);
        })
        .catch((error: any) => {
            response.status(400).send(`Error creating meal plan: ${error}`);
        });
});

/**
 * Deletes a personal meal plan.
 */
server.route('/api/people/:person/plans/:plan').delete((request, response) => {
    const person = request.params['person'];
    const plan = request.params['plan'];

    database.collection(RootCollections.PEOPLE).doc(person).collection(SubCollections.PLANS).doc(plan).delete()
        .then((firebaseResponse: any) => {
            response.status(200).send(`Deleted plan ${plan} from person ${person}`);
        })
        .catch((error: any) => {
            response.status(400).send(`{Error deleting plan ${plan} from person ${person}: ${error}`);
        });
});

/**
 * Links a recipe to a personal meal plan.
 *
 * Security: Owner
 */
server.route('/api/people/:person/plans/:plan').post((request, response) => {
    const person = request.params['person'];
    const plan = request.params['plan'];
    const {id, recipe}: PlanDay = request.body;

    const planDay: PlanDay = {
        id,
        recipe
    }

    const planDayDocument = database.collection(RootCollections.PEOPLE).doc(person).collection(SubCollections.PLANS).doc(plan).collection(SubCollections.DAYS).doc(planDay.id.toString());

    planDayDocument.set(planDay, {merge: true})
        .then((firebaseResponse: any) => {
            response.status(200).send(`Recipe ${planDay.recipe} successfully linked to day ${planDayDocument.id} of plan ${plan}`);
        })
        .catch((error: any) => {
            response.status(400).send(error);
        });
});

/**
 * Unlinks a recipe from a personal meal plan.
 *
 * Security: Owner
 */
server.route('/api/people/:person/plans/:plan/:day').delete((request, response) => {
    const person = request.params['person'];
    const plan = request.params['plan'];
    const day = request.params['day'];

    const planDayDocument = database.collection(RootCollections.PEOPLE).doc(person).collection(SubCollections.PLANS).doc(plan).collection(SubCollections.DAYS).doc(day);

    planDayDocument.delete()
        .then((firebaseResponse: any) => {
            response.status(200).send(`Recipe successfully unlinked from day ${planDayDocument.id} of plan ${plan}`);
        })
        .catch((error: any) => {
            response.status(400).send(error);
        });
});

/**
 * Sets the active status of a meal plan.
 */
server.route('/api/people/:person/plans/:plan/').post((request, response) => {
    const person = request.params['person'];
    const plan = request.params['plan'];

    const planDocument = database.collection(RootCollections.PEOPLE).doc(person).collection(SubCollections.PLANS).doc(plan);
    const personDocument = database.collection(RootCollections.PEOPLE).doc(person);

    database.runTransaction(transaction => {
        return transaction.get(planDocument)
            .then(result => {
                if (result.exists) {
                    personDocument.set({activeMealPlan: planDocument.id}, {merge: true})
                    .then(result => {
                        response.status(200).send(`Plan ${planDocument.id} set as the active meal plan`);
                    });
                }
            }).catch(error => {
                response.status(400).send(`Error setting plan ${planDocument.id} as the active meal plan`);
            });
    });
});

/**
 * Creates a group meal plan.
 *
 * Security: Must be the group owner or a contributor.
 * Data: [Day: Recipe]
 */

/**
 * Links a recipe to a group meal plan.
 *
 * Security: Must be the group owner or a contributor.
 * Data: [Day: Recipe]
 */

/**
 * Unlinks a recipe from a group meal plan.
 *
 * Security: Must be the group owner or a contributor.
 * Data: [Day: Recipe]
 */

/**
 * Starts the current week's meal plan.
 *
 * Security: Must be the group owner or a contributor.
 */

/**
 * Links a recipe to the current week's meal plan.
 *
 * Security: Must be the group owner or a contributor.
 * Data: [Day: Recipe]
 */

 /**
  * Unlinks a recipe from the current week's meal plan.
  *
  * Security: Must be the group owner or a contributor.
  * Data: [Day: Recipe]
  */

/**
 * Proposes a meal for this week's plan.
 *
 * Security: Must be the group owner or a contributor.
 * Data: [Day: Recipe]
 */