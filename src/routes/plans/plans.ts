import {server, database} from "../../index";
import {RootCollections, SubCollections} from "../../firebase/collections";
import {MessageFactory, MessageFactoryPrimaryDomain, MessageFactorySecondaryDomain, MessageFactoryOperation, MessageFactoryResult} from "../../utilities/MessageFactory";
import {NewMealPlanRequest, PlanDay} from "../../models/index";
import {getDocumentsFromSnapshot} from "../../firebase/helpers";

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
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.PEOPLE)
                    .setSecondaryDomain(MessageFactorySecondaryDomain.PLANS)
                    .setOperation(MessageFactoryOperation.GET)
                    .setResult(MessageFactoryResult.EMPTY)

                response.status(404).send(message);
            }
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.PEOPLE)
                .setSecondaryDomain(MessageFactorySecondaryDomain.PLANS)
                .setOperation(MessageFactoryOperation.GET)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            response.status(400).send(message);
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
                const plans = getDocumentsFromSnapshot(snapshot.docs);

                response.status(200).send(plans);
            } else {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.PLAN)
                    .setOperation(MessageFactoryOperation.GET)
                    .setResult(MessageFactoryResult.EMPTY);

                response.status(404).send(message);
            }
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.PLAN)
                .setOperation(MessageFactoryOperation.GET)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            response.status(400).send(message);
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
        .then(() => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.PLAN)
                .setOperation(MessageFactoryOperation.CREATE)
                .setResult(MessageFactoryResult.SUCCESS);

            response.status(200).send(message);
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.PLAN)
                .setOperation(MessageFactoryOperation.CREATE)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            response.status(400).send(message);
        });
});

/**
 * Deletes a personal meal plan.
 */
server.route('/api/people/:person/plans/:plan').delete((request, response) => {
    const person = request.params['person'];
    const plan = request.params['plan'];

    database.collection(RootCollections.PEOPLE).doc(person).collection(SubCollections.PLANS).doc(plan).delete()
        .then(() => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.PLAN)
                .setOperation(MessageFactoryOperation.DELETE)
                .setResult(MessageFactoryResult.ERROR);

            response.status(200).send(message);
        })
        .catch((error: any) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.PLAN)
                .setOperation(MessageFactoryOperation.DELETE)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            response.status(400).send(message);
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
        .then(() => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.PLAN)
                .setOperation(MessageFactoryOperation.CREATE)
                .setResult(MessageFactoryResult.SUCCESS);

            response.status(200).send(message);
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.PLAN)
                .setOperation(MessageFactoryOperation.CREATE)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            response.status(400).send(message);
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
        .then(() => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.PLAN)
                .setOperation(MessageFactoryOperation.DELETE)
                .setResult(MessageFactoryResult.SUCCESS);

            response.status(200).send(message);
        })
        .catch((error: firebase.firestore.FirestoreError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.PLAN)
                .setOperation(MessageFactoryOperation.CREATE)
                .setResult(MessageFactoryResult.SUCCESS)
                .setMessage(error.message);

            response.status(400).send(message);
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
                        .then(() => {
                            const message = new MessageFactory()
                                .setPrimaryDomain(MessageFactoryPrimaryDomain.PLAN)
                                .setOperation(MessageFactoryOperation.UPDATE)
                                .setResult(MessageFactoryResult.SUCCESS)
                                .setMessage(`Successfully set ${planDocument.id} as the active meal plan:`);

                            response.status(200).send(message);
                        });
                }
            }).catch((error: firebase.firestore.FirestoreError) => {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.PLAN)
                    .setOperation(MessageFactoryOperation.UPDATE)
                    .setResult(MessageFactoryResult.SUCCESS)
                    .setMessage(`Error setting ${planDocument.id} as the active meal plan: ${error.message}`);

                response.status(400).send(message);
            });
    });
});
