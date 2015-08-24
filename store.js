/* jshint browser: true */
/* jshint devel: true */
/* jshint jquery: true */
/* jshint strict: false */

//so that the test code runs
if( typeof app === "undefined" ){
	var app = {};
	app.depends = function( a, b ){
		b();
	};
}

app.depends([], function(){
'use strict';

//These classes are defined within this file:
//app.structure.store.Store

if( typeof module !== "undefined" ){
/* jshint ignore:start */
	module.exports = Store;
/* jshint ignore:end */
} else {
	app.store = {};
	app.store.Store = Store;
}

/*------------------------- polyfills ------------------------------*/
if (!String.prototype.isSubpathOf) {
	Object.defineProperty(String.prototype, 'isSubpathOf', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function(searchString, position) {
			position = position || 0;
			var matchPosition = this.lastIndexOf(searchString, position);
			if(matchPosition === position){
				if(matchPosition+searchString.length === this.length){
					return true;
			  	} else {
					var nextChar = this.substring(searchString.length, searchString.length+1);
					return nextChar === '.';
				}
			} else {
				return false;
			}     	    
		}
	});
}


if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, 'startsWith', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: function(searchString, position) {
      position = position || 0;
      return this.lastIndexOf(searchString, position) === position; 
    }
  });
}

/* actual Store function */

function Store(name, contents) {
	var targetCount =0;
	this.contents = contents || undefined;
	var _storeName = name;
	var subscriptions = {};
	var subscriptionsNextTick = {};
	var store = {};
	var dataStore = {};
	var fufillTargetTracker = {};
	//this.subscriptions = subscriptions;
	

	/*------------------------Store Helper Compontents ----------------*/
	function removeChildern(path) {
		for(var key in dataStore) {
			if(key.isSubpathOf(path)) {
				delete dataStore[key];
			}
		}
		for(var keys in store) {
			if(keys.isSubpathOf(path)) {
				delete store[keys];
				if(keys != path) {
					fufillTargetTracker[keys] = true;
					targetCount++;
				}
			}
		}
	}

	function getSplits(path) {
		var splits = [];
		var match;
		var regex = /\./g;
		while (match = regex.exec(path)) {// jshint ignore:line
			splits.push(match.index); 
		}
		return splits;
	}

	function fufillTargets() {
		/*
		console.log('----------------------Fufill Targets--------------------------------');
		console.log(fufillTargetTracker);
		console.log('--------------------------------------------------------------------');*/

		function fufillSubscriptionsNextTick( subs, value ){
			subs.map(function( sub ){
				setTimeout(function() {
					sub(value);
				}, 0);
			});
		}
		
		function fufillSubscriptions( subs, value ){
			subs.map(function( sub ){sub(value);});
		}

		// avoid long loops;
		if(targetCount > 30) {
			for(var key in subscriptionsNextTick) {
				if(fufillTargetTracker[key]) {
					fufillSubscriptionsNextTick(subscriptionsNextTick[key], dataStore[key]);
				}
			}
			for(var key in subscriptions) {
				if(fufillTargetTracker[key]) {
					fufillSubscriptions(subscriptions[key], dataStore[key]);
				}
			}
		}
		else {
			for(var key in fufillTargetTracker) {
				if(subscriptionsNextTick[key]) {
					fufillSubscriptionsNextTick(subscriptionsNextTick[key], dataStore[key]);
				}
				if(subscriptions[key]) {
					fufillSubscriptions(subscriptions[key], dataStore[key]);
				}
			}
		}
	}

	function fufill(path) {
		/*console.log('----------------fufill ---------------');
		console.log(path);
		console.log(subscriptions);
		console.log(subscriptionsNextTick);
		console.log(dataStore[path]);
		console.log('--------------------------------------');*/
		if(subscriptionsNextTick[path]) {
			subscriptionsNextTick[path].map(function(sub){
				setTimeout(function() {
					if(typeof sub != 'function') {
						throw new Error('Unable to fufill subscription ' + _storeName + ' at ' + path);
					}
					else {
						sub(dataStore[path]);
					}
				}, 0);
			});
		}
		if(subscriptions[path]) {
			subscriptions[path].map(function(sub){
				if(typeof sub != 'function') {
					throw new Error('Unable to fufill subscription ' + _storeName + ' at ' + path);
				}
				else {
					sub(dataStore[path]);
				}
			});
		}
		if(path.indexOf('.') !== -1) {
			fufill(path.slice(0, path.lastIndexOf('.')));
		}
	}

	function parseData(path, data) {
		/*console.log('---------------------------Parse Data----------------------------');
		console.log('PATH: ' + path);
		console.log('DATA:');
		console.log(data);
		console.log('------------------------------------------------------------------');*/
		function makeObject(key, data) {
			var varPath = path + '.' + key;
			Object.defineProperty(store[path], key, {set:new StoreSetter(varPath), get:new StoreGetter(varPath), enumerable:true, configurable:true});
			parseData(varPath, data[key]);
		}
		if(!store[path]) {
			if(data instanceof Array) {
				store[path] = new StorableArray(path);
			}
			else {
				store[path] = {};
			}
		}

		fufillTargetTracker[path] = true;
		targetCount++;

		dataStore[path] = data;
		if(typeof data === 'object' && data !== null) {
			for(var key in data) {
				makeObject(key, data);
			}
		}
		else {
			Object.defineProperty(store, path, {set:new StoreSetter(path), get:new DataGetter(data), enumerable:true, configurable:true});
		}
	}


	/*------------------------Store Getters and Setters  ---------------------*/
	function StoreSetter(path) {
		return function StoreSetter(data) {
			//nuke the data underneath
			fufillTargetTracker = {};
			targetCount = 0;
			removeChildern(path);
			//Fix parent data
			var splits = getSplits(path);
			for(var i = 0; i < splits.length; i++) {
				var parent = dataStore[path.substring(0,splits[i])];
				var child = path.substring(splits[i]+1);
				var childArray = child.split('.') || [child];
				var lastEle = childArray.length -1;
				for(var j = 0; j < lastEle; j++) {
					parent = parent[childArray[j]];
				}
				parent[childArray[lastEle]] = data;
			}
			parseData(path, data);
			fufill(path);
			delete fufillTargetTracker[path];
			targetCount--;
			fufillTargets();
		};
	}

	
	function StoreGetter(path) {
		return function StoreGetter() {
			return store[path];
		};
	}

	function DataGetter(value) {
		return function DataGetter() {
			return value;
		};
	}


	function ArrayPush(path) {
		return function() {
			fufillTargetTracker = {};
			targetCount = 0;
			var arrayStore = new StorableArray(path);
			for(var k =0 ; k < (store[path].length + arguments.length); k++) {
				Object.defineProperty(arrayStore, k, {set:new StoreSetter(path + '.' + k), get:new StoreGetter(path + '.' + k), enumerable:true, configurable:true});
			}
			store[path] = arrayStore;

			var pathArray = path.split('.');
			var parent = dataStore[pathArray[0]];
			for(var i = 1; i < pathArray.length; i++) {
				parent = parent[pathArray[i]];
			}

			for( var i = 0; i < arguments.length; i++) {	
				parent.push(arguments[i]);
				var toPath = dataStore[path].length -1;
				parseData(path + '.' + toPath, arguments[i]);
			}
			fufill(path);
			fufillTargets();
			return dataStore[path].length;
		};
	}
	function ArrayPop(path) {
		return function() {
			var popPath = path + '.' + (dataStore[path].length - 1);
			fufillTargetTracker = {};
			targetCount = 0;
			var popValue = dataStore[popPath];
			fufillTargetTracker[popPath] = true;
			targetCount++;
			removeChildern(popPath);

			var pathArray = path.split('.');
			var parent = dataStore[pathArray[0]];
			for(var i = 1; i < pathArray.length; i++) {
				parent = parent[pathArray[i]];
			}

			parent.pop();
			delete store[popPath];
			var arrayStore = new StorableArray(path);
			for(var k =0 ; k < (store[path].length -1); k++) {
				Object.defineProperty(arrayStore, k, {set:new StoreSetter(path + '.' + k), get:new StoreGetter(path + '.' + k), enumerable:true, configurable:true});
			}
			store[path] = arrayStore;
			fufill(path);
			fufillTargets();
			return popValue;
		};
	}

	function ArrayShift(path) {
		return function() {
			var shiftPath = path + '.0';
			fufillTargetTracker = {};
			targetCount = 0;
			var shiftValue = dataStore[shiftPath];
			
			var pathArray = path.split('.');
			var parent = dataStore[pathArray[0]];
			for(var i = 1; i < pathArray.length; i++) {
				parent = parent[pathArray[i]];
			}

			parent.shift();
			var remainingArray = dataStore[path];
			removeChildern(path);
			parseData(path, remainingArray);
			fufill(path);
			fufillTargets();
			return shiftValue;

		};

	}

	function ArrayUnshift(path) {
		return function() {
			fufillTargetTracker = {};
			targetCount = 0;
			var splits = getSplits(path);
			var parent;

			if(splits.length === 0) {
				parent = dataStore.contents;
			} 
			else {
				for(var j = 0; j < splits.length; j++) {
					parent = dataStore[path.substring(0,splits[j])];
					var child = path.substring(splits[j]+1);
					var childArray = child.split('.');
					for(var l = 0; l < childArray.length; l++) {
						if(childArray[l]) {
							parent = parent[childArray[l]];
						}
					}
				}
			}
			for(var i = arguments.length-1; i >=0 ; i--) {
				parent.unshift(arguments[i]);
			}
			var updatedArray = dataStore[path];
			removeChildern(path);
			parseData(path, updatedArray);
			fufill(path);
			fufillTargets();
			return updatedArray.length;
		};
	}

	function ArraySplice(path) {
		return function() {
			//Argument 1 is index, 
			//Argument 2 is count,
			//Remaing arguments are to be inserted;
			
			var spliceAt = parseInt(arguments[0]);
			var spliceCount = arguments[1];
			//get the elememts that are to be removed;
			var workingArray = dataStore[path];
			for(var m = spliceAt; m < workingArray.length; m++) {
				removeChildern(path + '.' + m);
			}

			//= dataStore[path].splice(spliceAt, spliceCount);
			fufillTargetTracker = {};
			targetCount = 0;
			//up to index nothing should change
			var arrayStore = new StorableArray(path);
			for(var k = 0; k < spliceAt; k++) {
				Object.defineProperty(arrayStore, k, {set:new StoreSetter(path + '.' + k), get:new StoreGetter(path + '.' + k), enumerable:true, configurable:true});
			}
			store[path] = arrayStore;

			var pathArray = path.split('.');
			var parent = dataStore[pathArray[0]];
			for(var i = 1; i < pathArray.length; i++) {
				parent = parent[pathArray[i]];
			}
			var removedElements = parent.splice(spliceAt, spliceCount);
			
			for( var i = 2; i < arguments.length; i++) {
				var index = spliceAt + i-2;
				parent.splice(index,0,arguments[i]);
				parseData(path + '.' + index, arguments[i]);
				Object.defineProperty(arrayStore, index, {
					set: new StoreSetter(path + '.' + index),
					get: new StoreGetter(path + '.' + index),
					enumerable: true,
					configurable: true
				});
			}
			for(var o = (spliceAt+arguments.length-2); o < dataStore[path].length; o++) {
				parseData(path + '.' + o, dataStore[path][o]);
				Object.defineProperty(arrayStore, o, {
					set: new StoreSetter(path + '.' + o),
					get: new StoreGetter(path + '.' + o),
					enumerable: true,
					configurable: true
				});
			}
			fufill(path);
			fufillTargets();
			return removedElements;
		};
	}
	function ArrayReverse(path) {
		return function() {
			fufillTargetTracker = {};
			targetCount = 0;

			var pathArray = path.split('.');
			var parent = dataStore[pathArray[0]];
			for(var i = 1; i < pathArray.length; i++) {
				parent = parent[pathArray[i]];
			}
			parent.reverse();

			var updatedArray = dataStore[path];
			removeChildern(path);
			parseData(path, updatedArray);
			fufill(path);
			fufillTargets();
		};
	}


	function StorableArray(path) {
		var array = [];
		Object.defineProperty(array, 'push', {value:new ArrayPush(path), enumerable:false});
		Object.defineProperty(array, 'pop', {value:new ArrayPop(path), enumerable:false} );
		Object.defineProperty(array, 'shift', {value: new ArrayShift(path), enumerable:false});
		Object.defineProperty(array, 'unshift', {value:new ArrayUnshift(path), enumerable:false});
		Object.defineProperty(array, 'splice', {value: new ArraySplice(path), enumerable:false});
		Object.defineProperty(array, 'reverse', {value: new ArrayReverse(path), enumerable:false});
		return array;
	} 

	this.add = function( path, data ){
		fufillTargetTracker = {};
		targetCount = 0;
		var parent = path.substring(0, path.lastIndexOf('.'));
		var key = path.substring(path.lastIndexOf('.') + 1);

		if(!(path in store)) {
			Object.defineProperty(store[parent], key, {set:new StoreSetter(path), get:new StoreGetter(path), enumerable:true, configurable: true});
		}
		else {
			removeChildern(path);
		}
		dataStore[parent][key] = data;
		parseData(path, data);
		fufill(path);
		fufillTargets();
	
	};
	this.modify = function(obj){
		if( typeof obj !== "object" || obj === null ){
			console.error("You must specify an enumerable object to modify the content of a store");
			return;
		}
		for( var i in obj ){
			this.add('contents.' + i, obj[i]);
		}
	};

	this.del = function(path){
		fufillTargetTracker = {};
		targetCount = 0;

		if(path.indexOf('contents') !== 0){
			path = 'contents.'+path;
		}
		//Remove the underlying data of the path
		removeChildern(path);
			
		var storeToDeleteFrom = store;		
		var dataStoreToDeleteFrom = dataStore;



		//Do length-1 as the last part of the path
		//is the key to be deleted, start at 0 as first part is this
		path = path.split('.');
		for(var i = 0; i<path.length-1; i++){
			storeToDeleteFrom = storeToDeleteFrom[path[i]];
			dataStoreToDeleteFrom = dataStoreToDeleteFrom[path[i]];
		}

		//Delete from the dataStore
		delete dataStoreToDeleteFrom[path[path.length-1]];
		//Delete the getters and setters from contents
		delete storeToDeleteFrom[path[path.length-1]];

		fufillTargets();
		fufill(path.join('.'));
	};

	this.subscribe = function(){
		var subFor = 'contents';
		if(arguments.length > 1) {
			subFor = arguments[0];
		}
		var sub = arguments[arguments.length -1];
		if(! subscriptions[subFor]) {
			subscriptions[subFor] = [];
		} 
		subscriptions[subFor].push(sub);
	};

	this.subscribeNextTick = function() {
		var subFor = 'contents';
		if(arguments.length > 1) {
			subFor = arguments[0];
		}
		var sub = arguments[arguments.length -1];
		if(! subscriptionsNextTick[subFor]) {
			subscriptionsNextTick[subFor] = [];
		} 
		subscriptionsNextTick[subFor].push(sub);
	};

	this.unsubscribe = function() {
		var subFor = 'contents';
		if(arguments.length > 1) {
			subFor = arguments[0];
		}
		var unsub = arguments[arguments.length -1];
		if(subscriptions[subFor]) {
			for(var i = 0; i < subscriptions[subFor].length; i++) {
				if(unsub == subscriptions[subFor][i]) {
					subscriptions[subFor].splice(i,1);
				}
			}
		}
	};

	this.unsubscribeNextTick = function() {
		var subFor = 'contents';
		if(arguments.length > 1) {
			subFor = arguments[0];
		}
		var unsub = arguments[arguments.length -1];
		if(subscriptionsNextTick[subFor]) {
			for(var i = 0; i < subscriptionsNextTick[subFor].length; i++) {
				if(unsub == subscriptionsNextTick[subFor][i]) {
					subscriptionsNextTick[subFor].splice(i,1);
				}
			}
		}
	};


	this.once = function() {
		var self = this;
		var subFor = 'contents';
		if(arguments.length > 1) {
			subFor = arguments[0];
		}
		var sub = arguments[arguments.length -1];
		var onceSub = function() {
			self.unsubscribe(subFor, onceSub);
			sub.apply(this, arguments);
		};
		self.subscribe(subFor, onceSub);
	};

	this.onceNextTick = function() {
		var self = this;
		var subFor = 'contents';
		if(arguments.length > 1) {
			subFor = arguments[0];
		}
		var sub = arguments[arguments.length -1];
		var onceSub = function() {
			self.unsubscribeNextTick(subFor, onceSub);
			sub.apply(this, arguments);
		};
		self.subscribeNextTick(subFor, onceSub);
	};

	this.printSubscriptions = function(path){
		console.log('Subscriptions for path:',path);
		console.log(subscriptions,subscriptions[path]);
		console.log('SubscriptionsNextTick for path:',path);
		console.log(subscriptionsNextTick,subscriptionsNextTick[path]);
	};

	this.printStores = function() {
		console.log('====================Store Contents=========================');
		console.log('-------------------- Data Store ---------------------------');
		console.log(dataStore);
		console.log('-------------------- Comp Store ---------------------------');
		console.log(store);
		console.log('===========================================================');
	};

	this.getObjPath = function(subobj, root, acc){
		if( root === undefined ){
			root = this.contents;
			acc = "contents";
			if( this.contents === undefined ){
				return null;
			}
		}

		if( typeof root !== "object" || root === null ){
			return null;
		}

		for( var i in root ){
			if( typeof root[i] === "object" && root[i] !== null ){
				if( root[i] === subobj ){
					return acc+"."+i;
				} else {
					var res = this.getObjPath( subobj, root[i], acc+"."+i );
					if( res !== null ){
						return res;
					}
				}
			}
		}

		return null;
	};

	this.getCleanElements = function(item){
		console.warn('Store: get clean elements has been depricated, use getCopyOF instead.');
		var ret = JSON.parse(JSON.stringify( item ));
		for( var i in ret ){
			ret[i] = item[i];
		}
		return ret;
	};

	this.forceUpdate = function(path){
		path = path === undefined ? 'contents' : path;
		fufill(path);
	};

	this.getCopyOf = function(id) {
		return dataStore[id];
	};

	this.getStoreAt = function(location) {
		return store[location];
	};

	Object.defineProperty(this, 'contents', {
		set: new StoreSetter('contents'),
		get: function() {
			return store.contents;
		}
	});
}

Store.prototype.makePathReadable = function ( url, store, ignore ){
	var elems = url.split(".").slice(1);
	//elems.splice( elems.length-1, 1);  //this will remove the last url element
	var parent = store.contents[ elems[0] ];
	ignore = ignore || [];

	var res = elems.reduce( function( prev, elem ){
		var item = parent[ elem ];
		if( Array.isArray(item) ){
			parent = item;
			return prev;
		} else {
			parent = parent[ elem ];
			if( ignore.indexOf( parent.name ) > -1 ){
				return prev;
			} else {
				return prev + "/" + parent.name;
			}
		}
	});

	var check = res.split("/");
	if( ignore.indexOf( check[0] ) > -1 ){
		return (check.slice(1).join("/"));
	} else {
		return res;
	}
};

});




