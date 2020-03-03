import { server, database } from "../../index";
import { RootCollections, SubCollections } from "../../firebase/collections";
import {
    MessageFactory,
    MessageFactoryPrimaryDomain,
    MessageFactorySecondaryDomain,
    MessageFactoryOperation,
    MessageFactoryResult
} from "../../utilities/MessageFactory";
import { GroupUserRole, Group } from "../../models/index";
import { getDocumentsFromSnapshot } from "../../firebase/helpers";

/**
 * Gets a person.
 */
server.route("/api/people/:person/").get((request, response) => {
    const person = request.params["person"];

    database
        .collection(RootCollections.PEOPLE)
        .doc(person)
        .get()
        .then((document: firebase.firestore.DocumentSnapshot) => {
            if (document.exists) {
                response.status(200).send(document.data());
            } else {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.PEOPLE)
                    .setOperation(MessageFactoryOperation.GET)
                    .setResult(MessageFactoryResult.EMPTY);

                response.status(404).send(message);
            }
        })
        .catch((error: firebase.FirebaseError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.PEOPLE)
                .setOperation(MessageFactoryOperation.GET)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            response.status(400).send(message);
        });
});

/**
 * Gets a person's groups.
 */
server.route("/api/people/:personId/groups").get((request, response) => {
    const personId = request.params["personId"];

    database
        .collection(RootCollections.PEOPLE)
        .doc(personId)
        .collection(SubCollections.GROUPS)
        .get()
        .then((snapshot: firebase.firestore.QuerySnapshot) => {
            if (snapshot.docs.length) {
                const groups = getDocumentsFromSnapshot(snapshot.docs);

                const groupDocuments = groups.map((group: any) =>
                    database
                        .collection(SubCollections.GROUPS)
                        .doc(group.id)
                        .get()
                );

                Promise.all([...groupDocuments]).then((documents: any) => {
                    const groups = documents
                        .map(
                            (document: firebase.firestore.DocumentSnapshot) => {
                                if (document.exists) {
                                    return document.data();
                                }
                            }
                        )
                        .filter((group: Group) => group);

                    response.status(200).send(groups);
                });
            } else {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.PEOPLE)
                    .setSecondaryDomain(MessageFactorySecondaryDomain.GROUPS)
                    .setOperation(MessageFactoryOperation.GET)
                    .setResult(MessageFactoryResult.EMPTY);

                response.status(404).send(message);
            }
        })
        .catch((error: firebase.FirebaseError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.PEOPLE)
                .setSecondaryDomain(MessageFactorySecondaryDomain.GROUPS)
                .setOperation(MessageFactoryOperation.GET)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            response.status(400).send(message);
        });
});

/**
 * Responds to an invite.
 */
server
    .route("/api/people/:person/invites/:invite")
    .post((request, response) => {
        const person = request.params["person"];
        const invite = request.params["invite"];
        const { group, answer } = request.body;

        const inviteResponse = {
            answer,
            active: false
        };

        const groupInviteCollection = database
            .collection(RootCollections.GROUPS)
            .doc(group)
            .collection(SubCollections.INVITES);
        const groupMemberCollection = database
            .collection(RootCollections.GROUPS)
            .doc(group)
            .collection(SubCollections.GROUP_MEMBERS);
        const groupInviteDocument = groupInviteCollection.doc(invite);

        const recipientInviteCollection = database
            .collection(RootCollections.PEOPLE)
            .doc(person)
            .collection(SubCollections.INVITES);
        const recipientInviteDocument = recipientInviteCollection.doc(invite);

        // Initiate a batch operation
        const batch = database.batch();

        // Update the group's invite with the answer and inactive status
        batch.update(groupInviteDocument, inviteResponse);

        // Update the recipient's invite with the answer and inactive status
        batch.update(recipientInviteDocument, inviteResponse);

        // If the recipient has accepted the invite, add them to the group
        if (answer === true) {
            batch.set(groupMemberCollection.doc(person), {
                id: person,
                status: GroupUserRole.MEMBER
            });
        }

        // Batch commit updates to the group and person's invites, then add the person to the group if the invite was accepted
        batch
            .commit()
            .then(() => {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.PEOPLE)
                    .setSecondaryDomain(MessageFactorySecondaryDomain.INVITES)
                    .setOperation(MessageFactoryOperation.UPDATE)
                    .setResult(MessageFactoryResult.SUCCESS)
                    .setMessage(`Person ${person} added to group ${group}`);

                response.status(200).send(message);
            })
            .catch((error: firebase.firestore.FirestoreError) => {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.PEOPLE)
                    .setSecondaryDomain(MessageFactorySecondaryDomain.INVITES)
                    .setOperation(MessageFactoryOperation.UPDATE)
                    .setResult(MessageFactoryResult.ERROR)
                    .setMessage(error.message);

                response.status(400).send(message);
            });
    });
