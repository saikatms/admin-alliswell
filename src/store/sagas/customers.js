import { put, takeEvery } from "redux-saga/effects";
import {
  manageLoading,
  genericActionsCustomers,
  getAllCustomers,
  getInitialCustomers,
  getLoyalCustomers,
  getCustomer,
  createCustomer,
  editCustomer,
  deleteCustomer,
} from "../actions";
import {
  getCollection,
  getDocById,
  addDoc,
  updateDoc,
  deleteDoc,
  saveFileOnStorage,
  deleteFileOnStorage,
  getPathReference,
} from "./firebaseAPI";
import { CUSTOMERS } from "../../shared/constant";
import {
  sortByNumber,
  sortAlphabetically,
  getElementsFromDocs,
} from "../../shared/utility";
import { PATH_CUSTOMERS } from "../../shared/constant";

/*
function that returns all customers to which
the authenticated user is associated
*/
function* getAllCustomersSaga({ payload }) {
  try {
    yield put(manageLoading.request());
    const { uid } = payload;
    const querySnapshot = yield getCollection(CUSTOMERS, uid);
    const customers = getElementsFromDocs(querySnapshot);
    const customersOrdered = sortAlphabetically(customers, "name", "ASC");
    yield put(getInitialCustomers.success({ customers: customersOrdered }));
  } catch (error) {
    yield put(genericActionsCustomers.failure({ error }));
  } finally {
    yield put(manageLoading.fulfill());
  }
}

/*
function that returns loyal customers to which
the authenticated user is associated
*/
function* getLoyalCustomersSaga({ payload }) {
  try {
    yield put(manageLoading.request());
    const { uid } = payload;
    const querySnapshot = yield getCollection(CUSTOMERS, uid);
    const customers = getElementsFromDocs(querySnapshot);
    const orderedCustomers = sortByNumber(
      customers,
      "numberOrderedProducts",
      "DESC"
    );
    let loyalCustomers = [];
    for (let i = 0; i < 3; i++) {
      loyalCustomers[i] = { ...orderedCustomers[i] };
    }
    yield put(getLoyalCustomers.success({ customers: loyalCustomers }));
  } catch (error) {
    yield put(genericActionsCustomers.failure({ error }));
  } finally {
    yield put(manageLoading.fulfill());
  }
}

/*
function that returns the corresponding customer
to the id passed as a parameter
*/
function* getCustomerSaga({ payload: idCustomer }) {
  try {
    yield put(manageLoading.request());
    const doc = yield getDocById(CUSTOMERS, idCustomer);
    const customer = { ...doc.data(), id: doc.id };
    yield put(getCustomer.success({ customer }));
  } catch (error) {
    yield put(genericActionsCustomers.failure({ error }));
  } finally {
    yield put(manageLoading.fulfill());
  }
}

/*
function that saves customer selected with 
associated icon in the firebase DB
*/
function* createCustomerSaga({ payload }) {
  try {
    yield put(manageLoading.request());
    const { dataCustomer, imageCustomer, history } = payload;
    const saveResponse = yield addDoc(CUSTOMERS, dataCustomer);
    if (imageCustomer instanceof File) {
      const uniqueFilename = `${imageCustomer.name}_${new Date().getTime()}`;
      const newFullPath = `${CUSTOMERS}/${uniqueFilename}`;
      const metadata = { customMetadata: { uid: dataCustomer.uid } };
      const uploadResponse = yield saveFileOnStorage(
        newFullPath,
        imageCustomer,
        metadata
      );
      const { snapshot } = uploadResponse.task;
      const pathReference = yield getPathReference(snapshot.ref.fullPath);
      const downloadUrl = yield pathReference.getDownloadURL();
      const updatedProperties = {
        downloadPath: downloadUrl,
        fullPath: newFullPath,
      };
      yield updateDoc(CUSTOMERS, saveResponse.id, updatedProperties);
    }
    history.push(PATH_CUSTOMERS);
  } catch (error) {
    yield put(genericActionsCustomers.failure({ error }));
  } finally {
    yield put(manageLoading.fulfill());
  }
}

/*
function that modifies customer selected with 
associated icon in the firebase DB
*/
function* editCustomerSaga({ payload }) {
  try {
    yield put(manageLoading.request());
    const {
      idCustomer,
      dataCustomer,
      imageCustomer,
      fullPath,
      history,
    } = payload;
    yield updateDoc(CUSTOMERS, idCustomer, dataCustomer);
    if (imageCustomer instanceof File) {
      if (dataCustomer.downloadPath) {
        yield deleteFileOnStorage(fullPath);
      }
      const uniqueFilename = imageCustomer.name + "_" + new Date().getTime();
      const newFullPath = `${CUSTOMERS}/${uniqueFilename}`;
      const metadata = { customMetadata: { uid: dataCustomer.uid } };
      const uploadResponse = yield saveFileOnStorage(
        newFullPath,
        imageCustomer,
        metadata
      );
      const { snapshot } = uploadResponse.task;
      const pathReference = yield getPathReference(snapshot.ref.fullPath);
      const downloadUrl = yield pathReference.getDownloadURL();
      const updatedProperties = {
        downloadPath: downloadUrl,
        fullPath: newFullPath,
      };
      yield updateDoc(CUSTOMERS, idCustomer, updatedProperties);
    }
    history.push(PATH_CUSTOMERS);
  } catch (error) {
    yield put(genericActionsCustomers.failure({ error }));
  } finally {
    yield put(manageLoading.fulfill());
  }
}

/*
function that removes customer selected with the associated 
icon from the firebase DB 
*/
function* deleteCustomerSaga({ payload }) {
  try {
    yield put(manageLoading.request());
    const { id, fullPath } = payload;
    yield deleteDoc(CUSTOMERS, id);
    if (fullPath) {
      yield deleteFileOnStorage(fullPath);
    }
    yield put(deleteCustomer.success({ id }));
  } catch (error) {
    yield put(genericActionsCustomers.failure({ error }));
  } finally {
    yield put(manageLoading.fulfill());
  }
}

export const customersSagas = [
  takeEvery(getAllCustomers.TRIGGER, getAllCustomersSaga),
  takeEvery(getLoyalCustomers.TRIGGER, getLoyalCustomersSaga),
  takeEvery(getCustomer.TRIGGER, getCustomerSaga),
  takeEvery(createCustomer.TRIGGER, createCustomerSaga),
  takeEvery(editCustomer.TRIGGER, editCustomerSaga),
  takeEvery(deleteCustomer.TRIGGER, deleteCustomerSaga),
];
