/**
 * Gets documents from a snapshot.
 *
 * @param snapshotDocuments firebase snapshot documents
 * @returns an array of firebase documents
 */
export const getDocumentsFromSnapshot = (snapshotDocuments: Array<firebase.firestore.QueryDocumentSnapshot>) => {
	return snapshotDocuments.map((document: firebase.firestore.QueryDocumentSnapshot) => document.data());
}