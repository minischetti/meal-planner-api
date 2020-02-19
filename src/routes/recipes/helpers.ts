import {MessageFactory, MessageFactoryPrimaryDomain, MessageFactorySecondaryDomain, MessageFactoryOperation, MessageFactoryResult} from "../../utilities/MessageFactory";
import {RecipePermissionEngine} from "../../permissions/RecipePermissionEngine";
import {RootCollections, SubCollections} from "../../firebase/collections";
import {Author} from "../../models/index";
import {database} from "../../index";
// require("./recipes");

/**
 * Updates a recipe with the given data.
 * @param request the request
 * @param response the response
 * @param newData the new recipe data
 */
export function updateRecipe(request: any, response: any, newData: any) {
    const recipe = request.params['recipe'];
    const {profileId} = request.body;

    if (!profileId || !newData) {
        const message = new MessageFactory()
            .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
            .setResult(MessageFactoryResult.BAD_REQUEST)

        return response.status(400).send(message);
    }

    const recipeDocument = database.collection(RootCollections.RECIPES).doc(recipe);

    return recipeDocument.get()
        .then(result => {
            if (result.exists) {
                const recipeMemberCollection = recipeDocument.collection(SubCollections.RECIPE_MEMBERS);
                const recipeMemberDocument = recipeMemberCollection.doc(profileId);

                recipeMemberDocument.get()
                    .then(result => {
                        const memberDetails = result.data();

                        if (!memberDetails) {
                            const message = new MessageFactory()
                                .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
                                .setSecondaryDomain(MessageFactorySecondaryDomain.AUTHORS)
                                .setResult(MessageFactoryResult.BAD_REQUEST)

                            return response.send(400).send(message);
                        }
                        const memberRole = memberDetails.role;

                        if (RecipePermissionEngine.canEditRecipe(memberRole)) {
                            if (newData.authors) {
                                if (!newData.authors.length) {
                                    const message = new MessageFactory()
                                        .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
                                        .setSecondaryDomain(MessageFactorySecondaryDomain.AUTHORS)
                                        .setResult(MessageFactoryResult.BAD_REQUEST)

                                    return response.send(400).send(message);
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

                                            return response.status(200).send(message);
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

                                        return response.status(200).send(message);
                                    })
                            }

                        } else {
                            const message = new MessageFactory()
                                .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
                                .setSecondaryDomain(MessageFactorySecondaryDomain.AUTHORS)
                                .setOperation(MessageFactoryOperation.UPDATE)
                                .setResult(MessageFactoryResult.PERMISSION_DENY);

                            return response.status(403).send(message);
                        }
                    });
            } else {
                const message = new MessageFactory()
                    .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
                    .setOperation(MessageFactoryOperation.GET)
                    .setResult(MessageFactoryResult.EMPTY);

                return response.status(404).send(message);
            }
        }).catch((error: firebase.firestore.FirestoreError) => {
            const message = new MessageFactory()
                .setPrimaryDomain(MessageFactoryPrimaryDomain.RECIPE)
                .setSecondaryDomain(MessageFactorySecondaryDomain.AUTHORS)
                .setOperation(MessageFactoryOperation.UPDATE)
                .setResult(MessageFactoryResult.ERROR)
                .setMessage(error.message);

            return response.status(400).send(message);
        });
}