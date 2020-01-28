import {server, database} from "../../index";
import {RootCollections, SubCollections} from "../../firebase/collections";
import {MessageFactory, MessageFactoryPrimaryDomain, MessageFactorySecondaryDomain, MessageFactoryOperation, MessageFactoryResult} from "../../utilities/MessageFactory";
import {RecipeValidationEngine} from "../../validation/RecipeValidationEngine";
import {NewMealPlanRequest, PlanDay} from "../../models/index";

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
