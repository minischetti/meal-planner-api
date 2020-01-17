import express, { Request, Response } from "express";
import {Profile, Recipe, Group, SourceInvite as SenderInvite, ReceivingInvite as RecipientInvite, GroupMemberStatus, GroupMember, Plan, PlanDay} from "./models/data-types";
import {NewUserRequest, NewProfileRequest, NewRecipeRequest, NewGroupRequest, GroupInviteResponseRequest, AddRecipeToGroupRequest, NewMealPlanRequest} from "./models/request-bodies"
import {SubCollections, RootCollections} from "./firebase/collections";

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
server.route('/api/users/').post((request: Request, response: any) => {
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
server.route('/api/profiles').post((request: Request, response: any) => {
    const {id, firstName, lastName} = request.body;

    const newUser: NewProfileRequest = {
        firstName,
        lastName
    }

    database.collection(RootCollections.PROFILES).doc(id).set(newUser)
        .then((firebaseResponse: any) => {
            response.status(200).send(firebaseResponse);
        })
        .catch((error: any) => {
            response.status(400).send(error);
        });
});

/**
 * Logs a user in.
 */
server.route('/api/login').post((request: Request, response: any) => {
    const {email, password} = request.body;

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((firebaseResponse: any) => {
            response.status(200).send(firebaseResponse);
        })
        .catch((error: any) => {
            response.status(400).send(error);
        });
});

/**
 * Logs a user out.
 */
server.route('/api/logout').post((request: Request, response: any) => {
    firebase.auth().signOut()
    .then((firebaseResponse: any) => {
        response.status(200).send("Logged out")
    })
    .catch((error: any) => {
        response.status(400).send(error);
    });
});

/**
 * Gets a profile.
 */
server.route('/api/profiles/:profile/').get((request, response) => {
    const profileId = request.params['profile'];

    database.collection(RootCollections.PROFILES).doc(profileId).get()
    .then((document: any) => {
        if (document.exists) {
            response.status(200).send(document.data());
        } else {
            response.status(404).send(`Profile ${profileId} does not exist`);
        }
    })
    .catch((error: any) => {
        response.status(400).send(error);
    });
});

/**
 * Gets a profile's recipes.
 */
server.route('/api/profiles/:profile/recipes').get((request, response) => {
    const profileId = request.params['profile'];

    database.collection(RootCollections.PROFILES).doc(profileId).collection(SubCollections.RECIPES).get()
        .then((snapshot: firebase.firestore.QuerySnapshot) => {
            if (snapshot.docs.length) {
                const recipes = snapshot.docs.map((document: any) => document.data());
                response.status(200).send(recipes);
            } else {
                response.status(404).send(`Profile ${profileId} does not have any recipes`);
            }
        })
        .catch((error: any) => {
            response.status(400).send(error);
        });
});


/**
 * Gets a recipe from a profile.
 */
server.route('/api/profiles/:profile/recipes/:recipe').get((request, response) => {
    const profileId = request.params['profile'];
    const recipeId = request.params['recipe'];

    database.collection(RootCollections.PROFILES).doc(profileId).collection(SubCollections.RECIPES).doc(recipeId).get()
        .then((document: any) => {
            if (document.exists) {
                response.status(200).send(document.data());
            } else {
                response.status(404).send("Recipe not found")
            }
        })
        .catch((error: any) => {
            response.status(400).send(error);
        });
});

/**
 * Adds a new recipe to a profile.
 */
server.route('/api/profiles/:profile/recipes').post((request, response) => {
    const profileId = request.params['profile'];
    const {name, authors, ingredients, instructions} = request.body;

    const newRecipe: NewRecipeRequest = {
        name,
        authors,
        ingredients,
        instructions
    };

    database.collection(RootCollections.PROFILES).doc(profileId).collection(SubCollections.RECIPES).doc().set(newRecipe)
        .then((firebaseResponse: any) => {
            response.status(200).send(firebaseResponse);
        })
        .catch((error: any) => {
            response.status(400).send(error);
        });
});

/**
 * Edits an existing recipe.
 */
server.route('/api/profiles/:profile/recipes/:recipe').put((request, response) => {
    const profileId = request.params['profile'];
    const recipeId = request.params['recipe'];
    const {name, authors, ingredients, instructions} = request.body;

    const editedRecipe: NewRecipeRequest = {
        name,
        authors,
        ingredients,
        instructions
    };

    database.collection(RootCollections.PROFILES).doc(profileId).collection(SubCollections.RECIPES).doc(recipeId).set(editedRecipe)
        .then((firebaseResponse: any) => {
            response.status(200).send(firebaseResponse);
        })
        .catch((error: any) => {
            response.status(400).send(error);
        });
});

/**
 * Deletes an existing recipe.
 */
server.route('/api/profiles/:profile/recipes/:recipe').delete((request, response) => {
    const profileId = request.params['profile'];
    const recipeId = request.params['recipe'];

    database.collection(RootCollections.PROFILES).doc(profileId).collection(SubCollections.RECIPES).doc(recipeId).delete()
        .then((firebaseResponse: any) => {
            response.status(200).send(`Recipe ${recipeId} successfully deleted`);
        })
        .catch((error: any) => {
            response.status(400).send(error);
        });
});

/**
 * Creates a new group.
 */
server.route('/api/groups').post((request, response) => {
    const {name, members} = request.body;

    const groupDocument = database.collection(RootCollections.GROUPS).doc();
    const groupDocumentId = groupDocument.id;

    const newGroup: NewGroupRequest = {
        id: groupDocumentId,
        name
    };

    // Initiate a batch operation
    const batch = database.batch();

    // Queue the creation of a new group
    batch.set(groupDocument, newGroup);

    // Queue the addition of each member to the group
    if (members.length) {
        members.forEach((member: GroupMember) => {
            batch.set(groupDocument.collection(SubCollections.MEMBERS).doc(member.id), member);
        });
    }

    // Commit the batch operation for group creation and member additions
    batch.commit()
        .then(() => {
            response.status(200).send(`Group ${groupDocumentId} successfully created`);
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            response.status(400).send(error);
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
        .catch((error: any) => {
            response.status(400).send(error);
        })
});

/**
 * Gets a specific group.
 */
server.route('/api/groups/:group').get((request, response) => {
    const groupId = request.params['group'];

    database.collection(RootCollections.GROUPS).doc(groupId).get()
        .then((document: any) => {
            if (document.exists) {
                response.status(200).send(document.data());
            } else {
                response.status(404).send("Group not found")
            }
        })
        .catch((error: any) => {
            response.status(400).send(error);
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
    const profileInviteDocument = database.collection(RootCollections.PROFILES).doc(recipient).collection(SubCollections.INVITES).doc(inviteId);

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
    batch.set(profileInviteDocument, recipientInvite);

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
server.route('/api/profiles/:profile/invites/:invite').post((request, response) => {
    const profile = request.params['profile'];
    const invite = request.params['invite'];
    const {group, answer} = request.body;

    const inviteResponse = {
        answer,
        active: false
    }

    const groupInviteCollection = database.collection(RootCollections.GROUPS).doc(group).collection(SubCollections.INVITES);
    const groupMemberCollection = database.collection(RootCollections.GROUPS).doc(group).collection(SubCollections.MEMBERS);
    const groupInviteDocument = groupInviteCollection.doc(invite);

    const recipientProfileInviteCollection = database.collection(RootCollections.PROFILES).doc(profile).collection(SubCollections.INVITES);
    const recipientProfileInviteDocument = recipientProfileInviteCollection.doc(invite);

    // Initiate a batch operation
    const batch = database.batch();

    // Update the group's invite with the answer and inactive status
    batch.update(groupInviteDocument, inviteResponse);

    // Update the recipient's invite with the answer and inactive status
    batch.update(recipientProfileInviteDocument, inviteResponse);

    // If the recipient has accepted the invite, add them to the group
    if (answer === true) {
        batch.set(groupMemberCollection.doc(profile), {id: profile, status: GroupMemberStatus.MEMBER});
    }

    // Batch commit updates to the group and profile invites, then add the user to the group if the invite was accepted
    batch.commit()
        .then(() => {
            response.status(200).send(`User ${profile} added to group ${group}`);
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            response.status(400).send(error);
        });
});

/**
 * Gets a recipe from a group.
 */
server.route('/api/groups/:group/recipes/:recipe').get((request, response) => {
    const group = request.params['group'];
    const recipe = request.params['recipe'];

    const recipeReference = database.collection(RootCollections.GROUPS).doc(group).collection(SubCollections.RECIPES).doc(recipe);

    recipeReference.get()
        .then(document => {
            if (document.exists) {
                response.status(200).send(document.data());
            } else {
                response.status(404).send(`Recipe ${recipe} does not exist in group ${group}`)
            }
        }).catch(error => {
            response.status(400).send(`Error retrieving recipe ${recipe} from group ${group}`);
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
        }).catch(error => {
            response.status(400).send(`Failure unlinking recipe ${groupRecipe.id} from group ${group}`);
        });
});

/**
 * Gets a personal meal plan.
 */
server.route('/api/profiles/:profile/plans/:plan').get((request, response) => {
    const profile = request.params['profile'];
    const plan = request.params['plan'];

    database.collection(RootCollections.PROFILES).doc(profile).collection(SubCollections.PLANS).doc(plan).get()
        .then(document => {
            if (document.exists) {
                response.status(200).send(document.data());
            } else {
                response.status(404).send(`Profile ${profile} does not contain plan ${plan}`)
            }
        }).catch(error => {
            response.status(400).send(`Error retrieving plan ${plan} from profile ${profile}`);
        });
});


/**
 * Gets all personal meal plans.
 */
server.route('/api/profiles/:profile/plans/').get((request, response) => {
    const profile = request.params['profile'];

    database.collection(RootCollections.PROFILES).doc(profile).collection(SubCollections.PLANS).get()
        .then((snapshot: firebase.firestore.QuerySnapshot) => {
            if (snapshot.docs.length) {
                const plans = snapshot.docs.map((document: any) => document.data());
                response.status(200).send(plans);
            } else {
                response.status(404).send(`Profile ${profile} does not have any meal plans`);
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
server.route('/api/profiles/:profile/plans').post((request, response) => {
    const profile = request.params['profile'];
    const {name, days} = request.body;

    const newMealPlanDocument = database.collection(RootCollections.PROFILES).doc(profile).collection(SubCollections.PLANS).doc();

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
server.route('/api/profiles/:profile/plans/:plan').delete((request, response) => {
    const profile = request.params['profile'];
    const plan = request.params['plan'];

    database.collection(RootCollections.PROFILES).doc(profile).collection(SubCollections.PLANS).doc(plan).delete()
        .then((firebaseResponse: any) => {
            response.status(200).send(`Deleted plan ${plan} from profile ${profile}`);
        })
        .catch((error: any) => {
            response.status(400).send(`{Error deleting plan ${plan} from profile ${profile}: ${error}`);
        });
});

/**
 * Links a recipe to a personal meal plan.
 *
 * Security: Owner
 */
server.route('/api/profiles/:profile/plans/:plan').post((request, response) => {
    const profile = request.params['profile'];
    const plan = request.params['plan'];
    const {id, recipe}: PlanDay = request.body;

    const planDay: PlanDay = {
        id,
        recipe
    }

    const planDayDocument = database.collection(RootCollections.PROFILES).doc(profile).collection(SubCollections.PLANS).doc(plan).collection(SubCollections.DAYS).doc(planDay.id.toString());

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
server.route('/api/profiles/:profile/plans/:plan/:day').delete((request, response) => {
    const profile = request.params['profile'];
    const plan = request.params['plan'];
    const day = request.params['day'];

    const planDayDocument = database.collection(RootCollections.PROFILES).doc(profile).collection(SubCollections.PLANS).doc(plan).collection(SubCollections.DAYS).doc(day);

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
server.route('/api/profiles/:profile/plans/:plan/').post((request, response) => {
    const profile = request.params['profile'];
    const plan = request.params['plan'];

    const planDocument = database.collection(RootCollections.PROFILES).doc(profile).collection(SubCollections.PLANS).doc(plan);
    const profileDocument = database.collection(RootCollections.PROFILES).doc(profile);

    database.runTransaction(transaction => {
        return transaction.get(planDocument)
            .then(result => {
                if (result.exists) {
                    profileDocument.set({activeMealPlan: planDocument.id}, {merge: true})
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