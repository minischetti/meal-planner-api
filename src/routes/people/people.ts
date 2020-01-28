import {server, database} from "../../index";
import {RootCollections, SubCollections} from "../../firebase/collections";
import {MessageFactory, MessageFactoryPrimaryDomain, MessageFactorySecondaryDomain, MessageFactoryOperation, MessageFactoryResult} from "../../utilities/MessageFactory";
import {RecipeValidationEngine} from "../../validation/RecipeValidationEngine";
import {RecipeUserRole, NewRecipeRequest, Author, GroupUserRole} from "../../models/index";

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
