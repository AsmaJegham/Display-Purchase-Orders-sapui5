sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (
	BaseController, JSONModel, History, Filter, FilterOperator) {
	"use strict";

	return BaseController.extend("mycompany.myapp.MyWorklistApp.controller.Object", {

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit : function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var iOriginalBusyDelay,
				oViewModel = new JSONModel({
					busy : true,
					delay : 0
				});

			this.getRouter().getRoute("po_itemSet").attachPatternMatched(this._onObjectMatched, this);

			// Store original busy indicator delay, so it can be restored later on
			iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
			this.setModel(oViewModel, "objectView");
			this.getOwnerComponent().getModel().metadataLoaded().then(function () {
					// Restore original busy indicator delay for the object view
					oViewModel.setProperty("/delay", iOriginalBusyDelay);
				}
			);
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */


		/**
		 * Event handler  for navigating back.
		 * It there is a history entry we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the worklist route.
		 * @public
		 */
		onNavBack : function() {
			var sPreviousHash = History.getInstance().getPreviousHash();

			if (sPreviousHash !== undefined) {
				history.go(-1);
			} else {
				this.getRouter().navTo("worklist", {}, true);
			}
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched : function (oEvent) {
			var sObjectId =  oEvent.getParameter("arguments").poNumber;
			this.getOwnerComponent().getModel().metadataLoaded().then( function() {	
				var that = this;
				var oViewModel = this.getModel("objectView")
				var oTable = this.byId("table2");
				var oModel = new sap.ui.model.json.JSONModel();
				var oFilter = new Filter("PoNumber", FilterOperator.EQ, sObjectId);
				this.getModel().read('/po_itemSet',{
				filters: [oFilter],
				success: function(oData){ 
				oModel.setData({
					tableData: oData.results
				});
				oTable.setModel(oModel, "myModel")	
				that.getOwnerComponent().setModel(oModel, "myModel")
				},
				error: function(oerr){
				console.log("error"); }
				});
				oViewModel.setProperty("/busy", false);	
				}.bind(this));
					
		},
	});

});