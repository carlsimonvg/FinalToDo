/**
 * Created by simonvg on 2017-05-18.
 */
/**
 * Class responsible for to do object properties and methods related to model
 */
class TodoModel {
    constructor(value) {
        this.id = 0;
        this.value = value;
        this.isComplete = false;
        this.isSelected = false;
    }
}

/**
 * Class responsible for saving and retrieving data from local storage.
 */
class DataStore {
    constructor(storeId) {
        this.storeId = storeId;
        this.items = this.loadStore();
        this.currentId = 0;
    }

    /**
     * Manage the id system and give me the next id when requested
     */
    getNextId() {
        if(this.currentId == 0 && this.items.length > 0) {
            this.currentId = this.items[this.items.length - 1].id;
        }

        this.currentId++;
        return this.currentId;
    }

    /**
     * On startup if I exist load me
     */
    loadStore() {
        return JSON.parse(localStorage.getItem(this.storeId));
    }

    /**
     * Save store
     */
    saveStore() {
        return localStorage.setItem(this.storeId, JSON.stringify(this.items));
    }

    /**
     * get items in data store that are selected
     * @returns {Array}
     */
    getSelectedItemsIdCollection() {
        return this.items.filter(item => item.isSelected).map(item => item.id);
    }

    /**
     * add new item to datastore
     * */
    addItem(model) {
        model.id = this.getNextId();
        this.items.push(model);
        this.saveStore();

        return model;
    }

    /**
     * remove selected items from data store
     */
    removeSelectedItems() {
        this.processSelectedItems(index => this.items.splice(index, 1));
    }

    /**
     * complete selected items from data store
     */
    completeSelectedItems() {
        this.processSelectedItems(index => this.items[index].isComplete = true);
    }

    /**
     * process selected items
     * @param callback
     */
    processSelectedItems(callback){
        let selectedItems = this.getSelectedItemsIdCollection();
        for(let i = 0; i < selectedItems.length; i++){
            let index = this.items.findIndex(el => el.id === selectedItems[i]);
            if(index > -1) {
                callback(index);
            }
        }
        this.saveStore();
    }

    /**
     * mark item as selected or deselected
     * @param id
     * @param isSelected
     */
    selectItem(id, isSelected){
        const index = this.getIndex(id);
        if(index > -1){
            this.items[index].isSelected = isSelected;
            this.saveStore();
        }
    }

    /**
     * return index of id
     * @param id
     * @returns {number}
     */
    getIndex(id){
        return this.items.findIndex(el => el.id == id);
    }

    /**
     * find and return stored item
     * @param id
     * @returns {*}
     */
    getItem(id) {
        return this.items.find(el => el.id == id);
    }

    /**
     * filter datastore based on search text*/
    filterItems(filterPhrase) {
        return this.items.filter(el => el.value.includes(filterPhrase));
    }
}

/**
 * Class responsible for manipulating the DOM
 */
class DomManager {
    constructor(listId, todoId, searchId){
        this.listId = listId;
        this.list = document.getElementById(listId);
        this.todoInput = document.getElementById(todoId);
        this.searchInput = document.getElementById(searchId);

        this.raiseEventHandler = this.registerEvent(listId, "click", this.raiseEvent.bind(this));
    }

    dispose() {
        this.unregisterEvent(this.listId, "click", this.raiseEventHandler);
        this.list = null;
        this.todoInput = null;
        this.searchInput = null;
    }

    registerEvent(id, event, handler) {
        document.getElementById(id).addEventListener(event, handler);
        return handler;
    }

    unregisterEvent(id, event, handler) {
        document.getElementById(id).removeEventListener(event, handler);
        handler = null;
    }

    /**
     * remove selected items from DOM
     * @param ids* <li id="li1><input type="checkbox" id="li1_checkbox"
     */
    removeSelectedItems(ids) {
        this.processDomItems(ids, item => this.list.removeChild(item));
    }

    /**
     * complete selected items from DOM
     * @param ids
     */
    completeSelectedItems(ids) {
        this.processDomItems(ids, item => item.style.textDecoration = "line-through");
    }

    /**
     * process dom items
     * @param ids
     * @param callback
     */
    processDomItems(ids, callback) {
        while(ids.length > 0){
            const query = `#li${ids[0]}`;
            let liItem = this.list.querySelector(query);
            callback(liItem);
            ids.shift();
        }
    }

    /**
     * Method to create li item with check box
     */
    createLiItem(newItem){
        let fragment = document.createDocumentFragment();

        let item = document.createElement("li");
        item.innerText = newItem.value;
        item.id = `li${newItem.id}`;
        if(newItem.isComplete){
            item.style.textDecoration = "line-through";
        }

        let checkbox = document.createElement("input");
        checkbox.id = `li${newItem.id}_checkbox`;
        checkbox.type = "checkbox";
        checkbox.className = "check";
        checkbox.checked = newItem.isSelected;

        item.appendChild(checkbox);
        fragment.appendChild(item);

        return fragment;
    }

    /**
     * raise combobox checked event
     * @param event
     */
    raiseEvent(event){
        if(event.target.className == "check") {
            let cusevent = new CustomEvent(
                "comboBoxChecked",
                {
                    detail: {
                        id: event.target.parentNode.id.substr(2),
                        isChecked: event.target.checked
                    },

                    bubbles: true,
                    cancelable: true
                }
            );
            event.target.dispatchEvent(cusevent);
        }
    }

    /**
     * Add new Li item based on text in textbox
     */
    addLiItem(newModel){
        let fragment = this.createLiItem(newModel);
        this.list.appendChild(fragment);
    }

    /**
     * Build unordered list based on data store items (for large lists you would use a checksum, for this size it does not need that complexity)
     */
    buildListForDisplay(items){
        while(this.list.firstChild ){
            this.list.removeChild(this.list.firstChild);
        }

        for (let i = 0, len = items.length; i < len; i++) {
            let fragment = this.createLiItem(items[i]);
            this.list.appendChild(fragment);
        }
    }
}

/**
 * Class that uses the other classes to preform relevant actions
 */
class TodoView {
    constructor(){
        this.todoListId = "orderList";
        this.todoInputId = "todoItemInput";
        this.searchInputId = "search";
        this.datastore = new DataStore("todoItems");
        this.domManager = new DomManager(this.todoListId, this.todoInputId, this.searchInputId);
        this.domManager.buildListForDisplay(this.datastore.items);

        this.addTodoItemHandler = this.domManager.registerEvent("addToList", "click", this.addTodoItem.bind(this));
        this.removeCheckedItemsFromListHandler = this.domManager.registerEvent("removeItemsFromList", "click", this.removeCheckedItemsFromList.bind(this));
        this.completeCheckedItemsFromListHandler = this.domManager.registerEvent("completeItems", "click", this.completeCheckedItemsFromList.bind(this));
        this.searchKeyUpHandler = this.domManager.registerEvent("search", "keyup", this.searchKeyUp.bind(this));

        this.comboBoxHandler = this.comboBoxChecked.bind(this);
        this.domManager.list.addEventListener("comboBoxChecked", this.comboBoxHandler, false);
    }

    dispose(){
        this.domManager.unregisterEvent("addToList", "click", this.addTodoItemHandler);
        this.domManager.unregisterEvent("removeItemsFromList", "click", this.removeCheckedItemsFromListHandler);
        this.domManager.unregisterEvent("completeItems", "click", this.completeCheckedItemsFromListHandler);
        this.domManager.unregisterEvent("search", "keyup", this.searchKeyUpHandler);

        this.domManager.list.removeEventListener("comboBoxChecked", this.comboBoxHandler);
        this.comboBoxHandler = null;

        this.datastore.dispose();
        this.datastore = null;
        this.domManager.dispose();
        this.domManager = null;
    }

    /**
     * combobox checked/unchecked event
     * @param args
     */
    comboBoxChecked(args){
        this.datastore.selectItem(args.detail.id, args.detail.isChecked);
    }

    /**
     * trigger filter based on newest value in searchbox
     */
    searchKeyUp(){
        let searchValue = this.domManager.searchInput.value;
        this.domManager.buildListForDisplay(this.datastore.filterItems(searchValue));
    }

    /**
     * Add new Li item based on text in textbox
     */
    addTodoItem(){
        let newToDoValue = this.domManager.todoInput.value;
        let newItem = this.datastore.addItem(new TodoModel(newToDoValue));
        this.domManager.addLiItem(newItem);
    }

    /**
     * loop through checked items and remove them from list
     */
    removeCheckedItemsFromList(){
        let selectedIds = this.datastore.getSelectedItemsIdCollection();
        this.domManager.removeSelectedItems(selectedIds);
        this.datastore.removeSelectedItems();
    }

    /**
     * loop through checked items and complete them from list
     */
    completeCheckedItemsFromList(){
        let selectedIds = this.datastore.getSelectedItemsIdCollection();
        this.domManager.completeSelectedItems(selectedIds);
        this.datastore.completeSelectedItems();
    }
}

let todoViewClass = new TodoView();