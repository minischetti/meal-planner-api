import express, { Request, Response } from "express";
import {Profile, Recipe, Group, Invite, NewUserRequest, NewProfileRequest, NewRecipeRequest, NewGroupRequest, NewInviteRequest} from "./models/index";
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

// const mockDatabase = {
//     users: [
//         {
//             id: 0,
//             exercises: Array<Exercise>(),
//             workouts: Array<Workout>()
//         }
//     ]
// }

/**
 * Creates a new user.
 */
server.route('/api/users/').post((request: Request, response: any) => {
    const {email, password} = request.body;
    console.log(request.body);

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
        .then((snapshot: any) => {
            const recipes = snapshot.map((document: any) => document.data());

            if (recipes.length) {
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
 * Gets a specific recipe from a profile.
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
    }

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
    }

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

    const newGroup: NewGroupRequest = {
        name,
        members
    }

    database.collection(RootCollections.GROUPS).doc().set(newGroup)
        .then((firebaseResponse: any) => {
            response.status(200).send(`Group successfully created`);
        })
        .catch((error: any) => {
            response.status(400).send(error);
        })
});

/**
 * Gets all groups.
 */
server.route('/api/groups').get((request, response) => {
    database.collection(RootCollections.GROUPS).get()
        .then((snapshot: any) => {
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
 * Invites a user to a group.
 */
server.route('/api/groups/:group/invite').post((request, response) => {
    const groupId = request.params['group'];
    const {sender, recipient} = request.body;

    const invite: NewInviteRequest = {
        sender,
        recipient,
        group: groupId
    }

    database.collection(RootCollections.GROUPS).doc(groupId).set()
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