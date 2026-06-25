import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDoshyzju1pEhR-9ZVgvaNZXzDzn5Rn-t4",
  authDomain: "project-5032938748792409729.firebaseapp.com",
  projectId: "project-5032938748792409729",
  storageBucket: "project-5032938748792409729.firebasestorage.app",
  messagingSenderId: "11260285119",
  appId: "1:11260285119:web:08d63ee844e03db96a760a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let products = [];
let orders = [];
let storeSettings = { delivery_price: "5000" };

// ضغط الصورة وتحويلها لـ Base64 (رابط طويل)
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.4));
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

const tabProducts = document.getElementById('tab-products');
const tabOrders = document.getElementById('tab-orders');
const tabSettings = document.getElementById('tab-settings');

const viewProducts = document.getElementById('view-products');
const viewOrders = document.getElementById('view-orders');
const viewSettings = document.getElementById('view-settings');

const productsList = document.getElementById('admin-products-list');
const ordersList = document.getElementById('admin-orders-list');
const inputDeliveryPrice = document.getElementById('input-delivery-price');

tabProducts.addEventListener('click', () => {
    tabProducts.classList.add('active'); tabOrders.classList.remove('active'); tabSettings.classList.remove('active');
    viewProducts.classList.add('active'); viewOrders.classList.remove('active'); viewSettings.classList.remove('active');
});
    
tabOrders.addEventListener('click', () => {
    tabOrders.classList.add('active'); tabProducts.classList.remove('active'); tabSettings.classList.remove('active');
    viewOrders.classList.add('active'); viewProducts.classList.remove('active'); viewSettings.classList.remove('active');
});

tabSettings.addEventListener('click', () => {
    tabSettings.classList.add('active'); tabProducts.classList.remove('active'); tabOrders.classList.remove('active');
    viewSettings.classList.add('active'); viewProducts.classList.remove('active'); viewOrders.classList.remove('active');
});

// استماع مباشر للمنتجات من فايربيس
onSnapshot(query(collection(db, "products"), orderBy("createdAt", "desc")), (snapshot) => {
    products = [];
    snapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
    });
    renderProducts();
});

// استماع مباشر للطلبات من فايربيس
onSnapshot(query(collection(db, "orders"), orderBy("date", "desc")), (snapshot) => {
    orders = [];
    snapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
    });
    renderOrders();
});

// استماع مباشر للإعدادات
onSnapshot(doc(db, "settings", "general"), (docSnap) => {
    if (docSnap.exists()) {
        storeSettings = docSnap.data();
        if (storeSettings.delivery_price) {
            inputDeliveryPrice.value = storeSettings.delivery_price;
        }
    }
});

// حفظ الإعدادات
document.getElementById('btn-save-settings').addEventListener('click', async () => {
    const price = inputDeliveryPrice.value.trim();
    if(!price) return alert("يرجى إدخال سعر التوصيل");
    
    const btn = document.getElementById('btn-save-settings');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    
    try {
        await setDoc(doc(db, "settings", "general"), {
            delivery_price: price
        }, { merge: true });
        alert("تم حفظ الإعدادات بنجاح");
    } catch(e) {
        console.error(e);
        alert("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ الإعدادات';
    }
});

function renderProducts() {
    productsList.innerHTML = '';
    if (products.length === 0) {
        productsList.innerHTML = '<p style="text-align:center; color:#888; padding: 20px;">لا توجد منتجات حالياً.</p>';
        return;
    }
    products.forEach(p => {
        const item = document.createElement('div');
        item.className = 'product-item';
        const pName = p.name || 'منتج غير محدد';
        const pPrice = parseInt((p.price || '0').toString().replace(/[^\d]/g, "")) || 0;
        item.innerHTML = `
            <img src="${p.img}" alt="Product">
            <div class="info">
                <div style="font-weight:bold; margin-bottom: 5px;">${pName} - <span style="color:#2ecc71;">${pPrice.toLocaleString('en-US')} د.ع</span></div>
                <div class="desc" style="font-size: 0.9em; color: #555;">${p.desc}</div>
                <div class="actions" style="margin-top: 10px;">
                    <button class="btn-icon" onclick="window.openEditModal('${p.id}')">✏️</button>
                    <button class="btn-icon" onclick="window.deleteProduct('${p.id}')">🗑️</button>
                </div>
            </div>
        `;
        productsList.appendChild(item);
    });
}

function renderOrders() {
    ordersList.innerHTML = '';
    if (orders.length === 0) {
        ordersList.innerHTML = '<p style="text-align:center; color:#888; padding: 20px;">لا توجد طلبات حالياً.</p>';
        return;
    }

    orders.forEach(o => {
        const item = document.createElement('div');
        item.className = 'order-card';
        const d = new Date(o.date);
        
        const subtotal = o.subtotalPrice ? `<p>💰 <b>مجموع المنتجات:</b> ${Number(o.subtotalPrice).toLocaleString('en-US')} د.ع</p>` : '';
        const delivery = o.deliveryCost ? `<p>🚚 <b>سعر التوصيل:</b> ${Number(o.deliveryCost).toLocaleString('en-US')} د.ع</p>` : '';
        const total = o.totalPrice ? `<p style="color:#e74c3c; font-weight:bold;">💸 <b>الإجمالي:</b> ${Number(o.totalPrice).toLocaleString('en-US')} د.ع</p>` : '';
        
        let productsHtml = '';
        if (o.products && o.products.length > 0) {
            productsHtml = o.products.map(p => `
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <img src="${p.img}" alt="Product" style="width: 40px; height: 40px; border-radius: 4px; margin-left: 10px; object-fit: cover; cursor: pointer;" onclick="window.openImageViewer(this.src)">
                    <span style="font-size: 0.9em;">${p.name} (${Number(p.price || 0).toLocaleString('en-US')} د.ع)</span>
                </div>
            `).join('');
        } else {
            productsHtml = `
                <img src="${o.productImg}" style="width: 50px; height: 50px; border-radius: 6px; margin-left: 10px; cursor: pointer;" onclick="window.openImageViewer(this.src)">
                <div>
                    <strong>تفاصيل المنتجات:</strong>
                    <p style="margin-top:5px; font-size:14px;">${o.productDesc}</p>
                </div>
            `;
        }

        item.innerHTML = `
            <div class="order-header">
                <strong>طلب جديد</strong>
                <span>⏱️ ${d.toLocaleDateString("ar-IQ", {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div class="order-product" style="display:block;">
                <div style="margin-bottom: 5px;"><strong>تفاصيل المنتجات:</strong></div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${o.products && o.products.length > 0 ? productsHtml : `<div style="display:flex; align-items:center;">${productsHtml}</div>`}
                </div>
            </div>
            <div class="order-info">
                <p>👤 <b>الاسم:</b> ${o.name}</p>
                <p>📞 <b>الرقم:</b> <span dir="ltr">${o.phone}</span></p>
                <p>📍 <b>المحافظة:</b> ${o.gov}</p>
                <p>🏠 <b>نقطة دالة:</b> ${o.address}</p>
                <hr style="margin: 10px 0; border: none; border-top: 1px dashed #ccc;">
                ${subtotal}
                ${delivery}
                ${total}
            </div>
            <div class="order-actions">
                <button class="btn-success btn-accept-order" onclick="window.acceptOrder('${o.id}')">قبول ✔️</button>
                <button class="btn-danger btn-delete-order" onclick="window.deleteOrder('${o.id}')">حذف ❌</button>
            </div>
        `;
        ordersList.appendChild(item);
    });
}

window.acceptOrder = async function(id) {
    if(confirm('هل أنت متأكد من قبول الطلب؟ سيتم أرشفته والحذف من القائمة.')) {
        try {
            await deleteDoc(doc(db, "orders", id));
        } catch(e) { alert("خطأ"); console.error(e); }
    }
}

window.deleteOrder = async function(id) {
    if(confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
        try {
            await deleteDoc(doc(db, "orders", id));
        } catch(e) { alert("خطأ"); console.error(e); }
    }
}

window.deleteProduct = async function(id) {
    if(confirm('هل تريد حذف هذا المنتج فعلاً؟')) {
        try {
            await deleteDoc(doc(db, "products", id));
        } catch(e) { alert("خطأ"); console.error(e); }
    }
}

window.openImageViewer = function(src) {
    const modal = document.getElementById('modal-image-viewer');
    const viewerImg = document.getElementById('viewer-image');
    if (modal && viewerImg) {
        viewerImg.src = src;
        modal.classList.add('show');
    }
}

document.getElementById('btn-close-image')?.addEventListener('click', () => {
    document.getElementById('modal-image-viewer')?.classList.remove('show');
});

const modalAdd = document.getElementById('modal-add-product');
const modalEdit = document.getElementById('modal-edit-product');

document.getElementById('btn-show-add-product').addEventListener('click', () => {
    if (products.length >= 6) {
        return alert("احذف احد المنتجات قاعدة البيانات ممتلئة او رقي الخدمه");
    }
    document.getElementById('input-product-image').value = '';
    document.getElementById('input-product-name').value = '';
    document.getElementById('input-product-price').value = '';
    document.getElementById('input-product-desc').value = '';
    modalAdd.classList.add('show');
});

document.getElementById('btn-cancel-product').addEventListener('click', () => modalAdd.classList.remove('show'));
document.getElementById('btn-cancel-edit').addEventListener('click', () => modalEdit.classList.remove('show'));

document.getElementById('btn-save-product').addEventListener('click', async () => {
    if (products.length >= 6) {
        return alert("احذف احد المنتجات قاعدة البيانات ممتلئة او رقي الخدمه");
    }

    const fileInput = document.getElementById('input-product-image');
    const name = document.getElementById('input-product-name').value.trim();
    const price = document.getElementById('input-product-price').value.trim();
    const desc = document.getElementById('input-product-desc').value.trim();
    
    if(!fileInput.files[0] || !name || !price || !desc) return alert("الرجاء تعبئة جميع الحقول ورفع صورة");

    const btn = document.getElementById('btn-save-product');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';

    try {
        const compressedBase64 = await compressImage(fileInput.files[0]);
        await addDoc(collection(db, "products"), {
            img: compressedBase64,
            name: name,
            price: price,
            desc: desc,
            createdAt: Date.now()
        });
        modalAdd.classList.remove('show');
    } catch(e) {
        alert("حدث خطأ أثناء الحفظ");
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ';
    }
});

window.openEditModal = function(id) {
    const p = products.find(prod => prod.id === id);
    if(p) {
        document.getElementById('edit-product-id').value = p.id;
        document.getElementById('edit-product-image').value = ''; 
        document.getElementById('edit-product-name').value = p.name || '';
        document.getElementById('edit-product-price').value = p.price || '';
        document.getElementById('edit-product-desc').value = p.desc || '';
        modalEdit.classList.add('show');
    }
}

document.getElementById('btn-update-product').addEventListener('click', async () => {
    const id = document.getElementById('edit-product-id').value;
    const fileInput = document.getElementById('edit-product-image');
    const name = document.getElementById('edit-product-name').value.trim();
    const price = document.getElementById('edit-product-price').value.trim();
    const desc = document.getElementById('edit-product-desc').value.trim();
    
    if(!name || !price || !desc) return alert("الرجاء تعبئة جميع الحقول المطلوبة");

    const btn = document.getElementById('btn-update-product');
    btn.disabled = true;
    btn.textContent = 'جاري التحديث...';

    try {
        const updates = { name: name, price: price, desc: desc };
        if (fileInput.files[0]) {
            updates.img = await compressImage(fileInput.files[0]);
        }
        await updateDoc(doc(db, "products", id), updates);
        modalEdit.classList.remove('show');
    } catch(e) {
        alert("حدث خطأ أثناء التحديث");
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ التعديلات';
    }
});
