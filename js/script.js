'use strict';
// https://github.com/GeekBrainsTutorial/online-store-api/tree/master/responses
const API_URL = 'https://raw.githubusercontent.com/GeekBrainsTutorial/online-store-api/master/responses';

/*function makeGETRequest (url, callback) {
    let xhr;
    if ( window.XMLHttpRequest) {
        xhr = new XMLHttpRequest();
    } else if ( window.ActiveXObject) {
        xhr = new ActiveXObject( "Microsoft.XMLHTTP" );
    }
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 ) {
            callback(xhr.responseText);
        }
    }
    xhr.open( 'GET' , url, true );
    xhr.send();
}*/

// Переделка makeGETRequest() на промисы
/**
 * Функция получения данных с сервера
 * @param {string} url - Адрес сервера
 * @param {function} callback - функция отрисовки товара в каталоге
 * @returns {Promise<unknown>} Возвращает данные каталога с сервера и обещает выполнить функцию отрисовки товара в каталоге
 */
let makeGETRequest = (url, callback) => {
     return new Promise((resolve, reject) => {
         let xhr = new XMLHttpRequest();
         xhr.open("GET", url, true);
         xhr.onreadystatechange = () => {
             if(xhr.readyState === 4){
                 if(xhr.status !== 200){
                     reject(console.log('Error'));
                 } else {
                     resolve(callback(xhr.responseText));
                 }
             }
         };
         xhr.send();
     });
 };

/**
 * Класс с данными каталога
 */
class GoodsList {
    /**
     * Конструктор со списком товаров в каталоге и атоматической загрузкой каталога с сервера при открытии страницы
     */
    constructor () {
        this.goods = [];
        this.fetchGoods();
        this.search();
    }

    /**
     * Загружает набор товаров в каталоге с сервера
     * @returns {Promise<unknown>}
     */
    fetchGoods() {
        return new Promise((resolve) => {
            this.goods =  makeGETRequest(`${API_URL}/catalogData.json` , (goods) => {
                    this.goods = JSON.parse(goods);
                    resolve(this.render(this.goods));
                })
        });
    }

    /**
     * Отрисовывает товары в каталоге
     */
    render(goodsToRender) {
        let listHtml = '' ;
        goodsToRender.forEach(good => {
            const goodItem = new GoodsItem(good.product_name, good.price, good.id_product);
            listHtml += goodItem.render();
        });
        document.querySelector('.goods-list').innerHTML = listHtml;

        document.querySelectorAll('.addGood').forEach(elem => {
            elem.addEventListener('click', (elem) => basket.addToBasket(elem));
        });
    }

    search() {
        document.querySelector('#header__search_button').addEventListener('click', () => {
            let itemToSearch = document.querySelector('.header__search').value;
            let regExp = new RegExp(itemToSearch,'ig');
            let goodsToSearch = this.goods.filter(good => regExp.test(good.product_name));
            this.render(goodsToSearch);
        });
    }
}

/**
 * Класс с данными товара в каталоге
 */
class GoodsItem {
    /**
     * Конструктор с данными о товаре
     * @param {string} product_name - имя товара
     * @param {number} price - цена товара за 1 шт.
     * @param {string} id_product - идентификатор товара
     * @param {string} image - ссылка на изображение товара
     */
    constructor (product_name, price, id_product, image = 'https://placehold.it/50x100') {
        this.id_product = id_product;
        this.image = image;
        this.product_name = product_name;
        this.price = price;
    }

    /**
     * Отрисовывает товар в каталоге
     * @returns {string} строка с шаблоном разметки товара
     */
    render() {
        return `<figure class="goods-item" data-id="${this.id_product}">
            <img src="${this.image}" alt="${this.image}">
            <figcaption> ${this.product_name}</figcaption>
            <p> ${this.price} &#8381</p>
            <button class = "addGood" data-id="${this.id_product}">Добавить</button>
        </figure>`;
    }
}

/**
 * Класс с данными корзины
 */
class Basket {
    constructor() {
        this.goodsInBasketCurrent = [];
        this._basketOpen();
        this._basketClose();
        this.fetchGoods().then((data) => {
            this.goodsInBasketCurrent = [...data['contents']];
        });
    }

    /**
     * Загружает набор товаров в корзине с сервера
     * @returns {Promise<any | void>}
     */
    fetchGoods(){
        return fetch(`${API_URL}/getBasket.json`)
            .then(result => result.json())
            .catch(error => {
                console.log(error);
            })
    }

    /**
     * Открывает окно корзины предварительноего очищая
     * @private
     */
    _basketOpen() {
        document.querySelector('#cartBtn').addEventListener('click', () => {

            for(let d of document.querySelector('.basket__goods').children) {
                d.remove();
            }

            document.querySelector('.basket').classList.toggle("invisible");
            this.renderBasket();
        });
    }

    /**
     * Закрывает окно корзины
     * @private
     */
    _basketClose() {
        document.querySelector('#closeBasket').addEventListener('click', () => {
            document.querySelector('.basket').classList.toggle("invisible");
        });
    }

    /**
     * Отрисовывает товары в корзине
     * @private
     */
    renderBasket() {
        let listHtml = '' ;
        this.goodsInBasketCurrent.forEach(good => {
            const goodItem = new BasketItem(good.product_name, good.price, good.id_product, 'https://placehold.it/50x100', good.quantity);
            listHtml += goodItem.render();
        });
        document.querySelector('.basket__goods').innerHTML = listHtml;

        document.querySelector('.basket__totalCost_value').textContent = this.sum();

        document.querySelectorAll('.plusGood').forEach(elem => {
            elem.addEventListener('click', (elem) => basket.addToBasket(elem));
        });

        document.querySelectorAll('.minusGood').forEach(elem => {
            elem.addEventListener('click', (elem) => basket._deleteFromBasket(elem));
        });
    }

    /**
     * Добавляет товар в корзину
     * @param elem - ссылка на событие клика мыши на добавление товара и увеличение количества
     * @private
     */
    addToBasket(elem) {
        let goodInBasketCheck = false;
        fetch(`${API_URL}/addToBasket.json`)
            .then(response => response.json())
            .then(answer => {
                if(answer['result']){
                    this.goodsInBasketCurrent.forEach(good => {
                        if(good['id_product'] === +elem.target.parentElement.dataset.id)  {
                            ++good['quantity'];
                            goodInBasketCheck = true;
                            if(elem.target.parentElement.className === 'closeBasket plusGood') { // увеличиваем значение количества на странице в корзине
                                elem.target.parentElement.parentElement.previousElementSibling.children[0].textContent = good['quantity'];
                            }
                        }
                    });

                    if(goodInBasketCheck === false) {
                        list.goods.forEach(goodOfAll => {
                            if(goodOfAll['id_product'] === +elem.target.parentElement.dataset.id) {
                                this.goodsInBasketCurrent.push(goodOfAll);
                                this.goodsInBasketCurrent[this.goodsInBasketCurrent.length-1]['quantity'] = 1;
                            }
                        });
                    }
                    document.querySelector('.basket__totalCost_value').textContent=this.sum();
                }else {
                    console.log("no server answer by AddItem");
                }
            })
            .catch(error => {
                console.log(error);
            });

    }

    /**
     *
     * @param {} elem - ссылка на событие клика мыши на уменьшение количества в корзине
     * @private
     */
    _deleteFromBasket(elem) {
        fetch(`${API_URL}/deleteFromBasket.json`)
            .then(response => response.json())
            .then(answer => {
                if(answer['result']){
                    for(let i = 0; i < this.goodsInBasketCurrent.length; i++) {
                        if(this.goodsInBasketCurrent[i]['id_product'] === +elem.target.parentElement.dataset.id) {
                            --this.goodsInBasketCurrent[i]['quantity'];
                            if(this.goodsInBasketCurrent[i]['quantity'] < 1) {
                                elem.target.parentElement.parentElement.parentElement.remove();
                                this.goodsInBasketCurrent.splice(i,1);
                            } else {
                                elem.target.parentElement.parentElement.previousElementSibling.children[0].textContent = this.goodsInBasketCurrent[i]['quantity'];
                            }

                        }
                    }
                    document.querySelector('.basket__totalCost_value').textContent=this.sum();
                }else {
                    console.log("no server answer by AddItem");
                }
            })
            .catch(error => {
                console.log(error);
            });
    }
    sum() {
        return this.goodsInBasketCurrent.reduce((sum,  {quantity, price}) => sum + price*quantity, 0);
    }
}

/**
 * Класс с данными товара в корзине
 */
class BasketItem {
    /**
     * Конструктор с данными о товаре в корзине
     * @param {string} product_name - имя товара
     * @param {number} price - цена товара за 1 шт.
     * @param {string} id_product - идентификатор товара
     * @param {string} image - ссылка на изображение товара
     * @param {number} quantity - количество тоовара в корзине
     */
    constructor (product_name, price, id_product, image , quantity) {
        this.id_product = id_product;
        this.image = image;
        this.product_name = product_name;
        this.price = price;
        this.quantity = quantity;
    }

    /**
     * Отрисовывает товар в корзине
     * @returns {string} возвращает шаблон разметки товара в корзине
     * @private
     */
    render() {
        return `<div class="basket__item" data-id="${this.id_product}">
                <figure>
                    <img src="${this.image}" alt="${this.image}">
                    <div>
                        <p class="basket__title"> ${this.product_name}</p>
                        <p class="basket__price"> Цена за 1 шт.: <span class="basket__price_value">${this.price}</span> &#8381</p>
                    </div>
                </figure>
                <p class="basket__quantity">Количество: <span class="basket__quantity_value">${this.quantity}</span> шт.</p>
                <div class="basket__quantity_buttons">
                    <button class="closeBasket plusGood" type="button" data-id="${this.id_product}"><i class="fas fa-plus"></i></button>
                    <button class="closeBasket minusGood" type="button" data-id="${this.id_product}"><i class="fas fa-minus"></i></button>
                </div>
            </div>`;
    }
}

const list = new GoodsList();
const basket = new Basket();