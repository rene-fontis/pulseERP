import { getDocs, collection } from 'firebase/firestore';

async function testFirestore() {
  const tenantsRef = collection(db, 'tenants');
  const snapshot = await getDocs(tenantsRef);
  
  snapshot.forEach(doc => {
    console.log('Mandant:', doc.id, doc.data());
  });
}

testFirestore();