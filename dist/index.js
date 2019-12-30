"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const collections_1 = require("./firebase/collections");
// Firebase App (the core Firebase SDK) is always required and
// must be listed before other Firebase SDKs
const firebase = __importStar(require("firebase/app"));
require("firebase/auth");
require("firebase/firestore");
require("firebase/database");
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
const database = !firebase.apps.length ? firebase.initializeApp(firebaseConfig).firestore() : firebase.firestore();
// Express
const server = express_1.default();
const listenPort = 8000;
server.listen(listenPort, () => {
    console.log(`Meal Planner API listening on port ${listenPort}`);
});
server.use(express_1.default.json());
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
server.route('/api/users/').post((request, response) => {
    const { email, password } = request.body;
    console.log(request.body);
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((firebaseResponse) => {
        response.status(200).send(firebaseResponse);
    })
        .catch((error) => {
        response.status(400).send(error);
    });
});
/**
 * Creates a new profile.
 */
server.route('/api/profiles').post((request, response) => {
    const { id, firstName, lastName } = request.body;
    const newUser = {
        firstName,
        lastName
    };
    database.collection(collections_1.RootCollections.PROFILES).doc(id).set(newUser)
        .then((firebaseResponse) => {
        response.status(200).send(firebaseResponse);
    })
        .catch((error) => {
        response.status(400).send(error);
    });
});
/**
 * Logs a user in.
 */
server.route('/api/login').post((request, response) => {
    const { email, password } = request.body;
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((firebaseResponse) => {
        response.status(200).send(firebaseResponse);
    })
        .catch((error) => {
        response.status(400).send(error);
    });
});
/**
 * Logs a user out.
 */
server.route('/api/logout').post((request, response) => {
    firebase.auth().signOut()
        .then((firebaseResponse) => {
        response.status(200).send("Logged out");
    })
        .catch((error) => {
        response.status(400).send(error);
    });
});
/**
 * Gets a profile.
 */
server.route('/api/profiles/:profile/').get((request, response) => {
    const profileId = request.params['profile'];
    database.collection(collections_1.RootCollections.PROFILES).doc(profileId).get()
        .then((document) => {
        if (document.exists) {
            response.status(200).send(document.data());
        }
        else {
            response.status(404).send(`Profile ${profileId} does not exist`);
        }
    })
        .catch((error) => {
        response.status(400).send(error);
    });
});
/**
 * Gets a profile's recipes.
 */
server.route('/api/profiles/:profile/recipes').get((request, response) => {
    const profileId = request.params['profile'];
    database.collection(collections_1.RootCollections.PROFILES).doc(profileId).collection(collections_1.SubCollections.RECIPES).get()
        .then((snapshot) => {
        const recipes = snapshot.map((document) => document.data());
        if (recipes.length) {
            response.status(200).send(recipes);
        }
        else {
            response.status(404).send(`Profile ${profileId} does not have any recipes`);
        }
    })
        .catch((error) => {
        response.status(400).send(error);
    });
});
/**
 * Gets a specific recipe from a profile.
 */
server.route('/api/profiles/:profile/recipes/:recipe').get((request, response) => {
    const profileId = request.params['profile'];
    const recipeId = request.params['recipe'];
    database.collection(collections_1.RootCollections.PROFILES).doc(profileId).collection(collections_1.SubCollections.RECIPES).doc(recipeId).get()
        .then((document) => {
        if (document.exists) {
            response.status(200).send(document.data());
        }
        else {
            response.status(404).send("Recipe not found");
        }
    })
        .catch((error) => {
        response.status(400).send(error);
    });
});
/**
 * Adds a new recipe to a profile.
 */
server.route('/api/profiles/:profile/recipes').post((request, response) => {
    const profileId = request.params['profile'];
    const { name, authors, ingredients, instructions } = request.body;
    const newRecipe = {
        name,
        authors,
        ingredients,
        instructions
    };
    database.collection(collections_1.RootCollections.PROFILES).doc(profileId).collection(collections_1.SubCollections.RECIPES).doc().set(newRecipe)
        .then((firebaseResponse) => {
        response.status(200).send(firebaseResponse);
    })
        .catch((error) => {
        response.status(400).send(error);
    });
});
/**
 * Edits an existing recipe.
 */
server.route('/api/profiles/:profile/recipes/:recipe').put((request, response) => {
    const profileId = request.params['profile'];
    const recipeId = request.params['recipe'];
    const { name, authors, ingredients, instructions } = request.body;
    const editedRecipe = {
        name,
        authors,
        ingredients,
        instructions
    };
    database.collection(collections_1.RootCollections.PROFILES).doc(profileId).collection(collections_1.SubCollections.RECIPES).doc(recipeId).set(editedRecipe)
        .then((firebaseResponse) => {
        response.status(200).send(firebaseResponse);
    })
        .catch((error) => {
        response.status(400).send(error);
    });
});
/**
 * Deletes an existing recipe.
 */
server.route('/api/profiles/:profile/recipes/:recipe').delete((request, response) => {
    const profileId = request.params['profile'];
    const recipeId = request.params['recipe'];
    database.collection(collections_1.RootCollections.PROFILES).doc(profileId).collection(collections_1.SubCollections.RECIPES).doc(recipeId).delete()
        .then((firebaseResponse) => {
        response.status(200).send(`Recipe ${recipeId} successfully deleted`);
    })
        .catch((error) => {
        response.status(400).send(error);
    });
});
/**
 * Creates a new group.
 */
server.route('/api/groups').post((request, response) => {
    const { name, members } = request.body;
    const newGroup = {
        name,
        members
    };
    database.collection(collections_1.RootCollections.GROUPS).doc().set(newGroup)
        .then((firebaseResponse) => {
        response.status(200).send(`Group successfully created`);
    })
        .catch((error) => {
        response.status(400).send(error);
    });
});
/**
 * Gets all groups.
 */
server.route('/api/groups').get((request, response) => {
    database.collection(collections_1.RootCollections.GROUPS).get()
        .then((snapshot) => {
        console.log("Snapshot Docs", snapshot.docs);
        if (snapshot.docs.length) {
            const groups = snapshot.docs.map((group) => group.data());
            response.status(200).send(groups);
        }
        else {
            response.status(404).send("There are no groups");
        }
    })
        .catch((error) => {
        console.log(error);
        response.status(400).send(error);
    });
});
/**
 * Gets a specific group.
 */
server.route('/api/groups/:group').get((request, response) => {
    const groupId = request.params['group'];
    database.collection(collections_1.RootCollections.GROUPS).doc(groupId).get()
        .then((document) => {
        if (document.exists) {
            response.status(200).send(document.data());
        }
        else {
            response.status(404).send("Group not found");
        }
    })
        .catch((error) => {
        response.status(400).send(error);
    });
});
// /**
//  * Get a user's groups.
//  */
// server.route('/api/users/:user/groups/').get((request, response) => {
//     const userId = parseInt(request.params['user']);
//     const user: User = mockDatabase.users.find((user) => user.id === userId);
//     // console.log(user);
//     if (!user) {
//         response.status(404).send(`User ${userId} does not exist`);
//         return;
//     }
//     if (!user.groups.length) {
//         response.status(404).send(`User ${userId} has no groups`);
//         return;
//     }
//     response.status(200).send(user.groups);
// });
// /**
//  * Get a user's group invites.
//  */
// server.route('/api/users/:user/invites/group').get((request, response) => {
//     const userId = parseInt(request.params['user']);
//     const user: User = mockDatabase.users.find((user) => user.id === userId);
//     // console.log(user);
//     if (!user) {
//         response.status(404).send(`User ${userId} does not exist`);
//         return;
//     }
//     if (!user.invites.group) {
//         response.status(404).send(`User ${userId} has no group invites`);
//         return;
//     }
//     response.status(200).send(user.invites.group);
// });
// /**
//  * Adds a recipe to a user's recipes.
//  */
// server.route('/api/:user/recipes/').post((request: Request, response: any) => {
//     const userId = parseInt(request.params['user']);
//     const user: User = mockDatabase.users.find(user => user.id === userId);
//     const recipeToAdd: Recipe = request.body;
//     if (!recipeToAdd) {
//         response.status(400).send("Must provide recipe to add");
//         return;
//     }
//     if (user.recipes.find(recipe => recipe.name === recipeToAdd.name)) {
//         response.status(409).send(`User ${userId} already has a recipe named ${recipeToAdd.name}`);
//         return;
//     }
//     user.recipes.push(recipeToAdd);
//     response.status(200).send(`Successfully added ${recipeToAdd.name} to user ${userId}`);
// });
// /**
//  * Deletes a recipe from a user's recipes.
//  */
// server.route('/api/:user/recipes/').delete((request, response) => {
//     const userId = parseInt(request.params['user']);
//     const user: User = mockDatabase.users.find(user => user.id === userId);
//     const exerciseToDelete: Recipe = request.body;
//     if (!exerciseToDelete) {
//         response.status(400).send("Must provide exercise to delete");
//         return;
//     }
//     if (!user.exercises.find(exercise => exercise.name === exerciseToDelete.name)) {
//         response.status(404).send(`${exerciseToDelete.name} does not exist under user ${userId}`);
//         return;
//     }
//     const indexOfExerciseToDelete: number = user.exercises.findIndex(exercise => exercise.name === exerciseToDelete.name)
//     user.exercises.splice(indexOfExerciseToDelete, 1);
//     response.status(200).send(`${exerciseToDelete.name} deleted from user ${userId}`);
// });
// /**
//  * Get a user's workouts.
//  */
// server.route('/api/:user/workouts/').get((request, response) => {
//     const userId = parseInt(request.params['user']);
//     const user: User = mockDatabase.users.find((user) => user.id === userId);
//     if (!user) {
//         response.status(400).send();
//         return;
//     }
//     if (!user.workouts.length) {
//         response.status(404).send();
//         return;
//     }
//     response.status(200).send(user.workouts);
// });
// /**
//  * Add a workout.
//  */
// server.route('/api/:user/workouts/').post((request: Request, response: any) => {
//     const userId = parseInt(request.params['user']);
//     const user: User = mockDatabase.users.find(user => user.id === userId);
//     const newWorkoutRequest: Workout = request.body;
//     console.log(newWorkoutRequest);
//     const workoutToAdd: Workout = {
//         name: newWorkoutRequest.name ? newWorkoutRequest.name : null,
//         date: new Date(),
//         active: true,
//         exercises: newWorkoutRequest.exercises
//     }
//     user.workouts.push(workoutToAdd);
//     response.status(200).send(`New workout added with ${workoutToAdd.name ? "name " + workoutToAdd.name : "date " + workoutToAdd.date}`);
// });
// /**
//  * Get a user's workout.
//  */
// server.route('/api/:user/workout/').get((request: Request, response: any) => {
//     const userId = parseInt(request.params['user']);
//     const user: User = mockDatabase.users.find(user => user.id === userId);
//     const requestWorkout: Workout = response.body;
//     const workout: Workout = user.workouts.find(workout => workout.date === requestWorkout.date);
//     if (!workout) {
//         response.status(404).send();
//         return;
//     }
//     response.status(200).send(workout);
// });
// /**
//  * Deactivate a user's workout.
//  */
// server.route('/api/:user/workout/deactivate/:workout').post((request: Request, response: any) => {
//     const userId = parseInt(request.params['user']);
//     const user: User = mockDatabase.users.find(user => user.id === userId);
//     const requestWorkout: Workout = response.body;
//     const workoutToFinish: Workout = user.workouts.find(workout => workout.date === requestWorkout.date);
//     if (!workoutToFinish) {
//         response.status(404).send();
//         return;
//     }
//     const indexOfWorkoutToFinish: number = user.workouts.findIndex(workout => workout.date === workoutToFinish.date);
//     user.workouts[indexOfWorkoutToFinish].active = false;
//     response.status(200).send();
// });
// /**
//  * Reactivate a user's workout.
//  */
// server.route('/api/:user/workout/reactivate/:workout').post((request: Request, response: any) => {
//     const userId = parseInt(request.params['user']);
//     const user: User = mockDatabase.users.find(user => user.id === userId);
//     const requestWorkout: Workout = response.body;
//     const workoutToFinish: Workout = user.workouts.find(workout => workout.date === requestWorkout.date);
//     if (!workoutToFinish) {
//         response.status(404).send();
//         return;
//     }
//     const indexOfWorkoutToFinish: number = user.workouts.findIndex(workout => workout.date === workoutToFinish.date);
//     user.workouts[indexOfWorkoutToFinish].active = true;
//     response.status(200).send(workoutToFinish);
// });
// /**
//  * Get a user's workout.
//  */
// server.route('/api/:user/workout/:workout').get((request: Request, response: any) => {
//     const userId = parseInt(request.params['user']);
//     const user: User = mockDatabase.users.find(user => user.id === userId);
//     const requestWorkout: Workout = response.body;
//     const workout: Workout = user.workouts.find(workout => workout.date === requestWorkout.date);
//     if (!workout) {
//         response.status(404).send();
//         return;
//     }
//     response.status(200).send(workout);
// });
// /**
//  * Delete a user's workout.
//  */
// server.route('/api/:user/workout/').delete((request: Request, response: any) => {
//     const userId = parseInt(request.params['user']);
//     const user: User = mockDatabase.users.find(user => user.id === userId);
//     const requestWorkout: Workout = response.body;
//     const workoutToDelete: Workout = user.workouts.find(workout => workout.date === requestWorkout.date);
//     if (!workoutToDelete) {
//         response.status(404).send();
//         return;
//     }
//     const indexOfWorkoutToDelete: number = user.workouts.findIndex(workout => workout.date === workoutToDelete.date);
//     user.exercises.splice(indexOfWorkoutToDelete, 1);
//     response.status(200).send(`Workout with ${workoutToDelete.name ? "name " + name : "date " + workoutToDelete.date}`);
// });
/**
 * /api/users
 * - post (create user)
 *
 * /api/users/:user
 * - get (get user)
 * - put (update user)
 * - delete (delete user)
 *
 * /api/exercises/:user
 * - post
 * - delete
 *
 * /api/exercises/:user/:exercise
 * - get (get exercise)
 * - put (replace exercise)
 * - delete (delete exercise)
 *
 * /api/workouts/:user
 * - post (create workout)
 *
 * /api/workouts/:user/:workout
 * - get (get workout)
 * - put (edit workout)
 * - post (finish workout)
 * - delete (delete workout)
 */ 
//# sourceMappingURL=index.js.map