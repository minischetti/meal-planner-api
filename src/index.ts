import express, {Request, Response} from "express";
import * as firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import "firebase/firestore";
import {RootCollections} from "./firebase/collections";
import {NewPersonProfileRequest} from "./models/request-bodies";

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
export const database: firebase.firestore.Firestore = !firebase.apps.length ? firebase.initializeApp(firebaseConfig).firestore() : firebase.firestore();

// Express
export const server = express();
const listenPort = 8000;

server.listen(listenPort, () => {
    console.log(`Meal Planner API listening on port ${listenPort}`);
});

server.use(express.json());

server.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:8080"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

// Routes
require("./routes/recipes/recipes");
require("./routes/people/people");
require("./routes/plans/plans");
require("./routes/groups/groups");

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



// START TEMP COMMENT
// /**
//  * Gets all recipes.
//  */
// server.route('/api/recipes/').get((request, response) => {
//     database.collection(RootCollections.RECIPES).get()
//         .then((snapshot: any) => {
//             if (snapshot.docs.length) {
//                 const recipes = snapshot.docs.map((recipe: firebase.firestore.QueryDocumentSnapshot) => recipe.data());

//                 response.status(200).send(recipes);
//             } else {
//                 response.status(404).send("Recipes not found")
//             }
//         })
//         .catch((error: firebase.FirebaseError) => {
//             response.status(400).send(`Error getting recipes: ${error.message}`);
//         });
// });

// /**
//  * Gets a single recipe.
//  */
// server.route('/api/recipes/:recipe/').get((request, response) => {
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
//             response.status(400).send(`Error getting recipe ${recipe}: ${error.message}`);
//         });
// });
// END TEMP COMMENT


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