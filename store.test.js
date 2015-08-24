/* jshint node:true */
/* global describe:false */
/* global it:false */
/* jshint expr:true */

'use strict';

var should = require('should');
var Store = require('store');

describe.skip('Store', function() {
	describe('As a simple value', function () {
		it('should call the subscription when changed', function( done ){
			var check = 'hello';
			var sub = function(value) {
				value.should.equal(check);
				done();
			};
			var testStore = new Store();
			testStore.subscribe(sub);
			testStore.contents = check;
		});
	});

	describe('As an Object', function() {
		it('should support subscribing to indivdual keys', function( done ){
			var check = { value1: 'Value1', value2: 'Value2' };
			var testStore = new Store();
			testStore.subscribe('contents.value1', function( value ){
				value.should.eql(check.value1);
				done();
			});
			testStore.contents = check;
		});
		describe('When subscribed to a key', function() {
			it('should proc on key value changes or the object changes', function( done ){
				var check = { value1: 'Value1', value2: 'Value2' };

				var testStore = new Store();
				var sub = function(value) {
					value.should.eql(check);
					testStore.unsubscribe(sub);
					testStore.subscribe(function( value ) {
						value.should.eql({ value1: 'NewValue', value2: 'Value2' });
					});
					testStore.subscribe('contents.value1', function( value ){
						value.should.eql('NewValue');
						done();
					});
					testStore.contents.value1 = 'NewValue';
				};
				testStore.subscribe(sub);
				testStore.contents = check;
			});
			it('should proc when a value which is an object changes', function( done ){
				var testStore = new Store();
				testStore.contents = { value1: 'Value1', value2: { subKey1: 'SUBKEY1', subKey2: 'SUBKEY2' } };

				var subs = 3;
				testStore.subscribe(function( value ){
					value.should.eql({ value1: 'Value1', value2: { subKey1: 'SUBKEY1', subKey2: 'NewValue' } });
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2', function( value ){
					value.should.eql({ subKey1: 'SUBKEY1', subKey2: 'NewValue' });
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2.subKey2', function( value ){
					value.should.equal('NewValue');
					if( !--subs ){ done(); }
				});

				testStore.contents.value2.subKey2 = 'NewValue';
			});
			it('should proc when a value which is an object changes through addition of a new key', function( done ){
				var testStore = new Store();
				testStore.contents = { value1: 'Value1', value2: 'Value2' };

				var subs = 3;
				testStore.subscribe(function( value ){
					value.should.eql({ value1: 'Value1', value2: { subKey1: 'SUBKEY1', subKey2: 'SUBKEY2' } });
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2', function( value ){
					value.should.eql({ subKey1: 'SUBKEY1', subKey2: 'SUBKEY2' });
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2.subKey2', function( value ){
					value.should.equal('SUBKEY2');
					if( !--subs ){ done(); }
				});

				testStore.contents.value2 = { subKey1: 'SUBKEY1', subKey2: 'SUBKEY2' };
			});
			/*
			it('should prevent the addition of new objects', function() {
				var check = {value1: 'Value1', value2: 'Value2'};
				var testStore = new Store();
				testStore.contents = check;
				(function() {testStore.contents.value3 = 'hello';}).should.throw();
			});
*/
			it('should proc when a value which is an array changes', function( done ){
				var testStore = new Store();
				testStore.contents = { value1: 'Value1', value2: 'Value2' };

				testStore.subscribe(function( value ){
					value.should.eql({ value1: 'Value1', value2: ['First', 'Second']});
					done();
				});

				testStore.contents.value2 = ['First', 'Second'];
			});
			it('should proc with nulls when parent value was deleted', function( done ){
				var testStore = new Store();
				testStore.contents = { value1: 'Value1', value2: { subKey1: 'SUBKEY1', subKey2: 'SUBKEY2' } };

				var subs = 3;
				testStore.subscribe(function( value ){
					value.should.eql('Goodbye');
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2', function( value ){
					should.not.exist(value);
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2.subKey2', function( value ){
					should.not.exist(value);
					if( !--subs ){ done(); }
				});

				testStore.contents = 'Goodbye';
			});

			it('should not proc when a different key changes', function( done ){
				var testStore = new Store();
				testStore.contents = { value1: 'Value1', value2: 'Value2' };

				var subs = 2;
				testStore.subscribe(function( value ){
					value.should.eql({ value1: 'Value1', value2: { subKey1: 'SUBKEY1', subKey2: 'SUBKEY2' } });
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value1', function() {
					throw new Error('contents.value1 should not be called.');
				});
				testStore.subscribe('contents.value2.subKey1', function( value ){
					value.should.equal('SUBKEY1');
					if( !--subs ){ done(); }
				});

				testStore.contents.value2 = { subKey1: 'SUBKEY1', subKey2: 'SUBKEY2' };
			});
		});
		describe('delete', function() {
			it("should call the parents and the removed children's subscriptions", function(){
				var testStore = new Store();
				testStore.contents = { value1: {value3: 'Value3', value4:'Value4'}, value2: 'Value2' };
				
				var called1 = false, called2 = false, called3 = false;
				testStore.subscribe(function(){
					called1 = true;
				});
				testStore.subscribe('contents.value1', function(){
					called2 = true;
				});
				testStore.subscribe('contents.value1.value3', function(){
					called3 = true;
				});


				testStore.del('contents.value1.value4');
				called1.should.be.true;
				called2.should.be.true;
				called3.should.be.false;


				called1 = true;
				testStore.del('value1');
				called1.should.be.true;
				called2.should.be.true;
				called3.should.be.true;
			});

			it('should remove all the data from dataStore', function(){
				var testStore = new Store();
				testStore.contents = { value1: {value3: 'Value3', value4:'Value4'}, value2: 'Value2' };
				testStore.del('contents.value1.value4');

				should(testStore.getCopyOf('contents.value1.value4')).be.undefined;
				testStore.getCopyOf('contents.value1.value3').should.eql('Value3');

				testStore.del('contents.value1');
				should(testStore.getCopyOf('contents.value1.value3')).be.undefined;
				should(testStore.getCopyOf('contents.value1')).be.undefined;
				testStore.getCopyOf('contents.value2').should.eql('Value2');
				should(testStore.getCopyOf('contents').value1).be.undefined;
			});
			it('should remove all the data from the store', function(){
				var testStore = new Store();
				testStore.contents = { value1: {value3: 'Value3', value4:'Value4'}, value2: 'Value2' };
				testStore.del('contents.value1.value4');

				should(testStore.getStoreAt('contents.value1.value4')).be.undefined;
				testStore.getStoreAt('contents.value1.value3').should.eql('Value3');

				testStore.del('contents.value1');
				should(testStore.getStoreAt('contents.value1.value3')).be.undefined;
				should(testStore.getStoreAt('contents.value1')).be.undefined;
				testStore.getStoreAt('contents.value2').should.eql('Value2');
				should(testStore.getStoreAt('contents').value1).be.undefined;
			});
			it('should not delete other items from contents', function() {
				var testStore = new Store();
				testStore.contents = { value1: {value3: 'Value3', value4:'Value4'}, value2: 'Value2' };
				testStore.del('contents.value1');
				testStore.contents.value2.should.equal('Value2');
			});
		});
	});
	describe('As an Array', function() {
		it('should support subscribing to individual items', function( done ){
			var testStore = new Store();
			testStore.contents = ['first', 'second', 'third'];

			testStore.subscribe('contents.1', function( value ){
				value.should.equal('SECOND');
				done();
			});

			testStore.contents[1] = 'SECOND';
		});
		describe('When subscribed to an Item', function() {
			it('should proc when the item is either a simple value or an array', function( done ){
				var testStore = new Store();
				testStore.contents = ['first', 'second', 'third'];

				var subs = 2;
				testStore.subscribe(function( value ){
					value.should.be.an.Array.with.lengthOf(3);
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.0', function( value ){
					value.should.equal('FIRST');
					if( !--subs ){ done(); }
				});

				testStore.contents[0] = 'FIRST';
			});
		});
		describe('When subscribed to the base array', function() {
			it('should proc when an item is pushed', function( done ){
				var testStore = new Store();
				testStore.contents = ['first', 'second', 'third'];

				var subs = 2, ffirst = true;
				testStore.subscribe(function( value ){
					value.should.be.an.Array;
					if( ffirst ){ ffirst = false;
						value.length.should.equal(4);
						value[3].should.equal('Last');
					} else {
						value[4].should.eql({ subKey1: 'SUBKEY1', subKey2: [ 'Second1', 'Second2' ] });
						value.length.should.equal(6);
					}
				
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.1', function() {
					throw new Error('contents.1 should not be called.');
				});

				testStore.contents.push('Last').should.equal(4);
				testStore.contents.push({ subKey1: 'SUBKEY1', subKey2: ['Second1', 'Second2'] }, 'final');
			});
			/*it('should prevent the addtion of array values without push', function() {
				var testStore = new Store();
				testStore.contents = ['first', 'second', 'third'];
				(function() {testStore.contents[3] = 'Last';}).should.throw();
			});*/
			it('should proc when an item is popped (fire for last ele and base ele)', function( done ){
				var testStore = new Store();
				testStore.contents = { value1: 'Value1', value2: ['first', 'second', { value4: 'Value5' }] };

				var subs = 2;
				testStore.subscribe('contents', function( value ){
					value.should.eql({ value1: 'Value1', value2: ['first', 'second'] });
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2.1', function() {
					throw new Error('contents.value2.1 should not be called.');
				});
				testStore.subscribe('contents.value2.2', function( value ){
					should.not.exist(value);
					if( !--subs ){ done(); }
				});

				testStore.contents.value2.pop().should.eql({ value4: 'Value5' });
			});
			it('should proc when an item is shifted (all elements should fire)', function( done ){
				var testStore = new Store();
				testStore.contents = { value1: 'Value1', value2: ['first', 'second', { value4: 'Value5' }] };

				var subs = 5;
				testStore.subscribe('contents', function( value ){
					value.should.eql({ value1: 'Value1', value2: ['second', { value4: 'Value5' }] });
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2', function( value ){
					value.should.eql(['second', { value4: 'Value5' }]);
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2.0', function( value ){
					value.should.equal('second');
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2.1', function( value ){
					value.should.eql({ value4: 'Value5' });
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2.2', function( value ){
					should.not.exist(value);
					if( !--subs ){ done(); }
				});

				testStore.contents.value2.shift().should.equal('first');
			});
			it('should proc when an item is unshifted (all elements should fire)', function( done ){
				var testStore = new Store();
				testStore.contents = { value1: 'Value1', value2: ['first', 'second', { value4: 'Value5' }] };

				var subs = 5;
				testStore.subscribe('contents', function( value ){
					value.should.eql({ value1: 'Value1', value2: ['Prime', { load: 'FrontLoad' }, 'first', 'second', { value4: 'Value5' }] });
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2', function( value ){
					value.should.eql(['Prime', { load: 'FrontLoad' }, 'first', 'second', { value4: 'Value5' }]);
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2.0', function( value ){
					value.should.equal('Prime');
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2.1', function( value ){
					value.should.eql({ load: 'FrontLoad' });
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2.2', function( value ){
					value.should.equal('first');
					if( !--subs ){ done(); }
				});

				testStore.contents.value2.unshift('Prime', { load: 'FrontLoad' }).should.equal(5);
			});
			it('should allow unshift on an empty array', function(done) {
				var testStore = new Store();
				testStore.contents = [];
				testStore.subscribe(function(array) {
					array[0].should.equal(1234);

				});
				testStore.contents.unshift(1234);
				testStore.contents[0].should.equal(1234);
				done();
			});
			it('should splice like a normal array', function(){
				var testStore = new Store();
				
				testStore.contents = ['a', 'b', 'c', 'd'];
				testStore.contents.splice(0, 1).should.eql(['a']);
				testStore.contents.should.eql(['b', 'c', 'd']);

				testStore.contents = ['a', 'b', 'c', 'd'];
				testStore.contents.splice(1, 2).should.eql(['b', 'c']);
				testStore.contents.should.eql(['a', 'd']);

				testStore.contents = ['a', 'b', 'c', 'd'];
				testStore.contents.splice(3, 1).should.eql(['d']);
				testStore.contents.should.eql(['a', 'b', 'c']);

				testStore.contents = ['a', 'b', 'c', 'd'];
				testStore.contents.splice(1, 2, 2, 2.5, 3).should.eql(['b', 'c']);
				testStore.contents.should.eql(['a', 2, 2.5, 3, 'd']);
			});
			it('should proc when an item is spliced', function( done ){
				var testStore = new Store();
				testStore.contents = { value1: 'Value1', value2: ['first', 'second', { value4: 'Value5' }, 'fourth', 'fifth'] };

				var subs = 5;
				testStore.subscribe('contents', function( value ){
					value.should.eql({ value1: 'Value1', value2: ['first', 'Prime', { load: 'FrontLoad' }, 'fifth'] });
					if( !--subs ){ final(); }
				});
				testStore.subscribe('contents.value2', function( value ){
					value.should.eql(['first', 'Prime', { load: 'FrontLoad' }, 'fifth']);
					if( !--subs ){ final(); }
				});
				testStore.subscribe('contents.value2.0', function() {
					throw new Error('contents.value2.0 should not be called.');
				});
				testStore.subscribe('contents.value2.1', function( value ){
					value.should.equal('Prime');
					if( !--subs ){ final(); }
				});
				testStore.subscribe('contents.value2.2', function( value ){
					value.should.eql({ load: 'FrontLoad' });
					if( !--subs ){ final(); }
				});
				testStore.subscribe('contents.value2.3', function( value ){
					value.should.equal('fifth');
					if( !--subs ){ final(); }
				});

				testStore.contents.value2.splice(1, 3, 'Prime', { load: 'FrontLoad' }).should.eql(['second', { value4: 'Value5' }, 'fourth']);

				function final() {
					testStore.contents.value2.should.eql(['first', 'Prime', { load: 'FrontLoad' }, 'fifth']);
					done();
				}
			});
			it('should proc when an item is reversed', function( done ){
				var testStore = new Store();
				testStore.contents = { value1: 'Value1', value2: ['first', 'second', { value4: 'Value5' }, 'fourth', 'fifth'] };

				var subs = 6;
				testStore.subscribe('contents', function( value ){
					value.should.eql({ value1: 'Value1', value2: ['fifth', 'fourth', { value4: 'Value5' }, 'second', 'first'] });
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2', function( value ){
					value.should.eql(['fifth', 'fourth', { value4: 'Value5' }, 'second', 'first']);
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2.0', function( value ){
					value.should.equal('fifth');
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2.1', function( value ){
					value.should.equal('fourth');
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2.2', function( value ){
					value.should.eql({ value4: 'Value5' });
					if( !--subs ){ done(); }
				});
				testStore.subscribe('contents.value2.3', function( value ){
					value.should.equal('second');
					if( !--subs ){ done(); }
				});

				testStore.contents.value2.reverse();
			});
		});
	});
	describe('Large Object Cumulative Test', function() {
		it('should allow push', function( done ){
			var display = new Store();
			display.contents = {
				visible:false,
				workbooks:[
					{
						name:"Ben's Workbook",
						enabled:false,
						items:[
							{
								type:"view",
								name:"My Awesome View",
								id:1,
								enabled:false
							},
							{
								type:"view",
								name:"Super View",
								id:2,
								enabled:false
							},
							{
								type:"view",
								name:"Working on this view",
								id:3,
								enabled:false
							},
							{
								type:"annotation",
								name:"Testing",
								id:4,
								enabled:false
							},
							{
								type:"annotation",
								name:"A private annotation",
								id:5,
								enabled:false
							},
							{
								type:"folder",
								name:"IHS FOLDER",
								enabled:false,
								items:[
									{
										type:"folder",
										name:"SUB FOLDER",
										enabled:false,
										items:[
											{
												type:"layer",
												name:"A sub layer layer",
												id:10,
												enabled:false
											},
											{
												type:"layer",
												name:"tessst",
												id:11,
												enabled:false
											}				
										]
									},
									{
										type:"layer",
										name:"An ihs layer",
										id:6,
										enabled:false
									},
									{
										type:"layer",
										name:"Another ihs layer",
										id:7,
										enabled:false
									}				
								]
							},
							{
								type:"layer",
								name:"Good Layer",
								id:8,
								enabled:false
							}	
						]
					},
					{
						name:"Somebody's Workbook",
						enabled:false,
						items:[	
						]
					}		
				]
			};
			var toPush = {
				type:"layer",
				name:"Pushed IHS Layer",
				id:77,
				enabled:false
			};
			var subs = 2;
			display.subscribe(function(value) {
				value.workbooks[0].items[5].items.length.should.equal(4);
				if( !--subs ){ done(); }
			});
			display.subscribe('contents.workbooks.0.items.5.items', function(value) {
				value.length.should.equal(4);
				if( !--subs ){ done(); }
			});
			display.contents.workbooks[0].items[5].items.push(toPush);
		});
		it('should allow pop', function( done ){
			var display = new Store();
			display.contents = {
				visible:false,
				workbooks:[
					{
						name:"Ben's Workbook",
						enabled:false,
						items:[
							{
								type:"view",
								name:"My Awesome View",
								id:1,
								enabled:false
							},
							{
								type:"view",
								name:"Super View",
								id:2,
								enabled:false
							},
							{
								type:"view",
								name:"Working on this view",
								id:3,
								enabled:false
							},
							{
								type:"annotation",
								name:"Testing",
								id:4,
								enabled:false
							},
							{
								type:"annotation",
								name:"A private annotation",
								id:5,
								enabled:false
							},
							{
								type:"folder",
								name:"IHS FOLDER",
								enabled:false,
								items:[
									{
										type:"folder",
										name:"SUB FOLDER",
										enabled:false,
										items:[
											{
												type:"layer",
												name:"A sub layer layer",
												id:10,
												enabled:false
											},
											{
												type:"layer",
												name:"tessst",
												id:11,
												enabled:false
											}				
										]
									},
									{
										type:"layer",
										name:"An ihs layer",
										id:6,
										enabled:false
									},
									{
										type:"layer",
										name:"Another ihs layer",
										id:7,
										enabled:false
									}				
								]
							},
							{
								type:"layer",
								name:"Good Layer",
								id:8,
								enabled:false
							}	
						]
					},
					{
						name:"Somebody's Workbook",
						enabled:false,
						items:[	
						]
					}		
				]
			};
			var subCount = 0;
			var subs = 2;
			display.subscribe(function(value) {
				value.workbooks[0].items[5].items.length.should.equal(2);
				if( !--subs ){ done(); }
			});
			display.subscribe('contents.workbooks.0.items.5.items', function(value) {
				subCount.should.equal(0);
				subCount++;
				value.length.should.equal(2);
				if( !--subs ){ done(); }
			});
			display.contents.workbooks[0].items[5].items.pop();
		});
		it('should allow unshift', function( done ){
			var display = new Store();
			display.contents = {
				visible:false,
				workbooks:[
					{
						name:"Ben's Workbook",
						enabled:false,
						items:[
							{
								type:"view",
								name:"My Awesome View",
								id:1,
								enabled:false
							},
							{
								type:"view",
								name:"Super View",
								id:2,
								enabled:false
							},
							{
								type:"view",
								name:"Working on this view",
								id:3,
								enabled:false
							},
							{
								type:"annotation",
								name:"Testing",
								id:4,
								enabled:false
							},
							{
								type:"annotation",
								name:"A private annotation",
								id:5,
								enabled:false
							},
							{
								type:"folder",
								name:"IHS FOLDER",
								enabled:false,
								items:[
									{
										type:"folder",
										name:"SUB FOLDER",
										enabled:false,
										items:[
											{
												type:"layer",
												name:"A sub layer layer",
												id:10,
												enabled:false
											},
											{
												type:"layer",
												name:"tessst",
												id:11,
												enabled:false
											}				
										]
									},
									{
										type:"layer",
										name:"An ihs layer",
										id:6,
										enabled:false
									},
									{
										type:"layer",
										name:"Another ihs layer",
										id:7,
										enabled:false
									}				
								]
							},
							{
								type:"layer",
								name:"Good Layer",
								id:8,
								enabled:false
							}	
						]
					},
					{
						name:"Somebody's Workbook",
						enabled:false,
						items:[	
						]
					}		
				]
			};
			var subCount = 0;
			var subs = 2;
			display.subscribe('contents.workbooks.0.items.5.items', function(val) {
				val.length.should.equal(4);
				val[0].id.should.equal(77);
				if( !--subs ){ done(); }
			});
			display.subscribe(function(value) {
				subCount.should.equal(0);
				subCount++;
				value.workbooks[0].items[5].items.length.should.equal(4);
				if( !--subs ){ done(); }
			});
			
			var toUnshift = {
				type:"layer",
				name:"Pushed IHS Layer",
				id:77,
				enabled:false
			};
			display.contents.workbooks[0].items[5].items.unshift(toUnshift);
		});
		it('should allow shift', function( done ){
			var display = new Store();
			display.contents = {
				visible:false,
				workbooks:[
					{
						name:"Ben's Workbook",
						enabled:false,
						items:[
							{
								type:"view",
								name:"My Awesome View",
								id:1,
								enabled:false
							},
							{
								type:"view",
								name:"Super View",
								id:2,
								enabled:false
							},
							{
								type:"view",
								name:"Working on this view",
								id:3,
								enabled:false
							},
							{
								type:"annotation",
								name:"Testing",
								id:4,
								enabled:false
							},
							{
								type:"annotation",
								name:"A private annotation",
								id:5,
								enabled:false
							},
							{
								type:"folder",
								name:"IHS FOLDER",
								enabled:false,
								items:[
									{
										type:"folder",
										name:"SUB FOLDER",
										enabled:false,
										items:[
											{
												type:"layer",
												name:"A sub layer layer",
												id:10,
												enabled:false
											},
											{
												type:"layer",
												name:"tessst",
												id:11,
												enabled:false
											}				
										]
									},
									{
										type:"layer",
										name:"An ihs layer",
										id:6,
										enabled:false
									},
									{
										type:"layer",
										name:"Another ihs layer",
										id:7,
										enabled:false
									}				
								]
							},
							{
								type:"layer",
								name:"Good Layer",
								id:8,
								enabled:false
							}	
						]
					},
					{
						name:"Somebody's Workbook",
						enabled:false,
						items:[	
						]
					}		
				]
			};
			var subcount = 0;
			var subs = 2;
			display.subscribe('contents.workbooks.0.items.5.items', function(val) {
				val.length.should.equal(2);
				val[0].id.should.equal(6);
				if( !--subs ){ done(); }
			});
			display.subscribe(function(value) {
				subcount.should.equal(0);
				subcount++;
				value.workbooks[0].items[5].items.length.should.equal(2);
				if( !--subs ){ done(); }
			});
			
			display.contents.workbooks[0].items[5].items.shift();
		});
		it('should allow splice', function( done ){
			var display = new Store();
			display.contents = {
				visible:false,
				workbooks:[
					{
						name:"Ben's Workbook",
						enabled:false,
						items:[
							{
								type:"view",
								name:"My Awesome View",
								id:1,
								enabled:false
							},
							{
								type:"view",
								name:"Super View",
								id:2,
								enabled:false
							},
							{
								type:"view",
								name:"Working on this view",
								id:3,
								enabled:false
							},
							{
								type:"annotation",
								name:"Testing",
								id:4,
								enabled:false
							},
							{
								type:"annotation",
								name:"A private annotation",
								id:5,
								enabled:false
							},
							{
								type:"folder",
								name:"IHS FOLDER",
								enabled:false,
								items:[
									{
										type:"folder",
										name:"SUB FOLDER",
										enabled:false,
										items:[
											{
												type:"layer",
												name:"A sub layer layer",
												id:10,
												enabled:false
											},
											{
												type:"layer",
												name:"tessst",
												id:11,
												enabled:false
											}				
										]
									},
									{
										type:"layer",
										name:"An ihs layer",
										id:6,
										enabled:false
									},
									{
										type:"layer",
										name:"Another ihs layer",
										id:7,
										enabled:false
									}				
								]
							},
							{
								type:"layer",
								name:"Good Layer",
								id:8,
								enabled:false
							}	
						]
					},
					{
						name:"Somebody's Workbook",
						enabled:false,
						items:[	
						]
					}		
				]
			};
			var subcount = 0;
			var subs = 2;
			display.subscribe('contents.workbooks.0.items.5.items', function(val) {
				val.length.should.equal(3);
				val[1].id.should.equal(77);
				if( !--subs ){ done(); }
			});
			
			display.subscribe(function(value) {
				subcount.should.equal(0);
				subcount++;
				value.workbooks[0].items[5].items.length.should.equal(3);
				if( !--subs ){ done(); }
			});
			var toSplice = {
				type:"layer",
				name:"Pushed IHS Layer",
				id:77,
				enabled:false
			};
			
			display.contents.workbooks[0].items[5].items.splice(1,1, toSplice);
		});
		it('should allow reverse', function( done ){
			var display = new Store();
			display.contents = {
				visible:false,
				workbooks:[
					{
						name:"Ben's Workbook",
						enabled:false,
						items:[
							{
								type:"view",
								name:"My Awesome View",
								id:1,
								enabled:false
							},
							{
								type:"view",
								name:"Super View",
								id:2,
								enabled:false
							},
							{
								type:"view",
								name:"Working on this view",
								id:3,
								enabled:false
							},
							{
								type:"annotation",
								name:"Testing",
								id:4,
								enabled:false
							},
							{
								type:"annotation",
								name:"A private annotation",
								id:5,
								enabled:false
							},
							{
								type:"folder",
								name:"IHS FOLDER",
								enabled:false,
								items:[
									{
										type:"folder",
										name:"SUB FOLDER",
										enabled:false,
										items:[
											{
												type:"layer",
												name:"A sub layer layer",
												id:10,
												enabled:false
											},
											{
												type:"layer",
												name:"tessst",
												id:11,
												enabled:false
											}				
										]
									},
									{
										type:"layer",
										name:"An ihs layer",
										id:6,
										enabled:false
									},
									{
										type:"layer",
										name:"Another ihs layer",
										id:7,
										enabled:false
									}				
								]
							},
							{
								type:"layer",
								name:"Good Layer",
								id:8,
								enabled:false
							}	
						]
					},
					{
						name:"Somebody's Workbook",
						enabled:false,
						items:[	
						]
					}		
				]
			};
			var subcount = 0;
			var subs = 2;
			display.subscribe('contents.workbooks.0.items.5.items', function(val) {
				val[0].id.should.equal(7);
				val[1].id.should.equal(6);
				if( !--subs ){ done(); }
			});
			display.subscribe(function(value) {
				subcount.should.equal(0);
				subcount++;
				value.workbooks[0].items[5].items.length.should.equal(3);
				value.workbooks[0].items[5].items[0].id.should.equal(7);
				value.workbooks[0].items[5].items[1].id.should.equal(6);
				if( !--subs ){ done(); }
			});
			
			display.contents.workbooks[0].items[5].items.reverse();
		});
	});
	describe('Unsubscribe', function() {
		it('should allow a user to unsubscribe from the store', function( done ){
			var test = new Store();

			var subs = 3, first = true;
			function loseThisFunction ( value ){
				if( first ) { first = false;
					value.should.equal('hello');
					if( !--subs ){ done(); }
				} else {
					throw new Error('This subscription should not have run.');
				}
			}
			function keepThisFunction() {
				if( !--subs ){ done(); }
			}
			test.subscribe(loseThisFunction);
			test.subscribe(keepThisFunction);
			test.contents = 'hello';
			test.unsubscribe(loseThisFunction);
			test.contents = 'goodbye';
		});
		it('should allow a user to unsubscribe from a substore', function( done ){
			var test = new Store();

			var subs = 3, first = true;
			function loseThisFunction ( value ){
				if( first ) { first = false;
					value.should.equal('hello');
					if( !--subs ){ done(); }
				} else {
					throw new Error('This subscription should not have run.');
				}
			}
			function keepThisFunction() {
				if( !--subs ){ done(); }
			}
			test.subscribe('contents.object', loseThisFunction);
			test.subscribe('contents.object', keepThisFunction);
			test.contents = { object: 'hello' };
			test.unsubscribe('contents.object', loseThisFunction);
			test.contents = { object: 'goodbye' };
		});
	});
	describe('once', function() {
		it('should allow a user to subscribe once to the base store', function( done ){
			var s = new Store();
			var sfirst = true;
			/* note this test depends on fufilment order */
			s.subscribe(function( value ){
				if( sfirst ) { sfirst = false;
					value.should.equal('hello');
				} else {
					value.should.equal('hello again');
					done();
				}
			});
			var ffirst = true;
			s.once(function( value ){
				if( ffirst ){ 
					value.should.equal('hello');
					ffirst = false;
					s.contents = 'hello again';
				} else {
					done(new Error('Subscriptions added with once should only be called once.'));
				}
			});
			s.contents = 'hello';
		});
		it('should allow a user to subscribe once to a subkey of the store', function( done ){
			var s = new Store();

			var ffirst = true;
			s.once('contents.object', function( value ){
				if( ffirst ){ ffirst = false;
					value.should.equal('hello');
					s.contents = { object: 'hello again' };
				} else {
					done(new Error('Subscriptions added with once should only be called once.'));
				}
			});
			var sfirst = true;
			s.subscribeNextTick('contents.object', function( value ){
				if( sfirst ) { sfirst = false;
					value.should.equal('hello');
				} else {
					value.should.equal('hello again');
					done();
				}
			});

			s.contents = { object: 'hello' };
		});
	});
	describe('addKey', function() {
		it('should add key at path', function( ){
			var display = new Store();
			display.contents = {
				visible:false,
				workbooks:[
					{
						name:"Ben's Workbook",
						enabled:false,
						items:[]
					}
				]
			};
			var baseSubCalled = false;
			display.subscribe(function() {
				baseSubCalled = true;
			});

			display.add('contents.newKey', 'I am New');
			display.contents.newKey.should.equal('I am New');
			baseSubCalled.should.be.true;
		});
		it('should replace existing key', function( ){
			var display = new Store();
			display.contents = {
				visible:false,
				workbooks:[
					{
						name:"Ben's Workbook",
						enabled:false,
						items:[]
					}
				]
			};
			var baseSubCalled = false;
			display.subscribe(function() {
				baseSubCalled = true;
			});

			display.add('contents.visible', true);
			display.contents.visible.should.equal(true);
			baseSubCalled.should.be.true;
		});
		it('should be able to add teh same key twice', function( ){
			var display = new Store();
			display.contents = {
				visible:false,
				workbooks:[
					{
						name:"Ben's Workbook",
						enabled:false,
						items:[]
					}
				]
			};
			var baseSubCalled = false;
			display.subscribe(function() {
				baseSubCalled = true;
			});
			display.add('contents.visible', {something:'is a thing'});

			display.add('contents.visible', "wack");
			display.contents.visible.should.equal('wack');
			baseSubCalled.should.be.true;
		});
	});
});
