sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/export/Spreadsheet"
], function (BaseController, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, Spreadsheet) {
	"use strict";

	return BaseController.extend("mycompany.myapp.MyWorklistApp.controller.Worklist", {

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit : function () {
			var oViewModel,
				iOriginalBusyDelay,
				oTable = this.byId("table");

			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			this._oTable = oTable;
			// keeps the search state
			this._aTableSearchState = [];

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay: 0,
				inquiry: 0,
				contract: 0,
				purchaseOrder: 0,
				delivery: 0,
				countAll: 0
			});
			this.setModel(oViewModel, "worklistView");
			// Create an object of filters
			this._mFilters = {
				"inquiry": [new Filter("Bstyp", FilterOperator.EQ, 'A')],
				"purchaseOrder": [new Filter("Bstyp", FilterOperator.EQ, 'F')],
				"contract": [new Filter("Bstyp", FilterOperator.EQ, 'K')],
				"delivery": [new Filter("Bstyp", FilterOperator.EQ, 'L')],
				"all": []
			};

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oTable.attachEventOnce("updateFinished", function(){
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished : function (oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				oViewModel = this.getModel("worklistView"),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				// Get the count for all the purchase orders and set the value to 'countAll' property
				this.getModel().read("/purchase_orderSet/$count", {
					success: function (oData) {
						oViewModel.setProperty("/countAll", oData);
					}
				});
				// Get the count for all the different types of purchase orders
				this.getModel().read("/purchase_orderSet/$count", {
					success: function (oData) {
						oViewModel.setProperty("/inquiry", oData);
					},
					filters: this._mFilters.inquiry
				});
				// read the count for the unitsInStock filter
				this.getModel().read("/purchase_orderSet/$count", {
					success: function (oData) {
						oViewModel.setProperty("/contract", oData);
					},
					filters: this._mFilters.contract
				});
				// read the count for the outOfStock filter
				this.getModel().read("/purchase_orderSet/$count", {
					success: function(oData){
						oViewModel.setProperty("/purchaseOrder", oData);
					},
					filters: this._mFilters.purchaseOrder
				});
				// read the count for the shortage filter
				this.getModel().read("/purchase_orderSet/$count", {
					success: function(oData){
						oViewModel.setProperty("/delivery", oData);
					},
					filters: this._mFilters.delivery
				});
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPress : function (oEvent) {
			// The source is the list item that got pressed
			this._showObject(oEvent.getSource());
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser history
		 * @public
		 */
		onNavBack : function() {
			history.go(-1);
		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh : function () {
			var oTable = this.byId("table");
			oTable.getBinding("items").refresh();
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showObject : function (oItem) {
			this.getRouter().navTo("po_itemSet", {
				poNumber: oItem.getBindingContext().getProperty("Ebeln")
			});
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */

		/**
		 * Displays an error message dialog. The displayed dialog is content density aware.
		 * @param {string} sMsg The error message to be displayed
		 * @private
		 */
		_showErrorMessage: function(sMsg) {
			MessageBox.error(sMsg, {
				styleClass: this.getOwnerComponent().getContentDensityClass()
			});
		},

		/**
		 * Event handler when a filter tab gets pressed
		 * @param {sap.ui.base.Event} oEvent the filter tab event
		 * @public
		 */
		onQuickFilter: function(oEvent) {
			var oBinding = this._oTable.getBinding("items"),
				sKey = oEvent.getParameter("selectedKey");
			oBinding.filter(this._mFilters[sKey]);
		},

		// Search Box
		onSearch : function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			} else {
				var aTableSearchState = [];
				var sQuery = oEvent.getParameter("query");

				if (sQuery && sQuery.length > 0) {
				aTableSearchState = [new Filter("Ebeln", FilterOperator.Contains, sQuery),
					new Filter("Name1", FilterOperator.Contains, sQuery.toUpperCase()),
					new Filter("Name1", FilterOperator.Contains, sQuery.toLowerCase()), 
					new Filter("Lifnr", FilterOperator.Contains, sQuery),
					new Filter("Bukrs", FilterOperator.Contains, sQuery),
					new Filter("Spras", FilterOperator.Contains, sQuery.toUpperCase()),
					new Filter("Spras", FilterOperator.Contains, sQuery.toLowerCase())];
				var	oFilterToSetOnTheTable = new Filter({
						filters: aTableSearchState,
						and: false
					});
				}
				this._applySearch(oFilterToSetOnTheTable);
			}
		},

		_applySearch: function(aTableSearchState) {
			var oTable = this.byId("table"),
				oViewModel = this.getModel("worklistView");
			oTable.getBinding("items").filter(aTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aTableSearchState.aFilters.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		},

		createColumnConfig: function() {
			return [{label:"Numéro commande", property: "Ebeln"},
			{label:"Fournisseur", property: ["Name1", "Lifnr"], template: '{0}, {1}', width: 30},
			{label:"Société", property: "Bukrs"},
			{label:"Langue", property: "Spras"}]},

		// Export as Excel File

		onExport: function () {
			const oBinding = this._oTable.getBinding("items");
			console.log(oBinding.getDownloadUrl());
			const entryPath = "/sap.app/dataSources/mainService/uri";
			const serviceUrl = this.getOwnerComponent().getManifestEntry(entryPath);
			console.log(serviceUrl);
			var oCols = this.createColumnConfig()

			var oSettings = {
						workbook: { columns: oCols, 
									context: {sheetName: "PurchaseOrders"}
								},
						dataSource:{
							type: "odata",
							dataUrl: oBinding.getDownloadUrl() ,
							serviceUrl: serviceUrl,
							headers: oBinding.getModel().getHeaders(),
							count: oBinding.getLength(),
							sizeLimit: 1000}
						,
						worker: false,
						fileName: "PurchaseOrders.xlsx"}
			var oSpreadsheet = new Spreadsheet(oSettings);
			console.log(oSpreadsheet);			
			oSpreadsheet.build()
			  .then( function() { MessageToast.show("Exportation terminée");
			  oSpreadsheet.destroy(); })
			  .catch( function(sMessage) { MessageToast.show("Erreur d'exportation: " + sMessage); });
			}

	});

});