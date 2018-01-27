var stage_test_functions = {
	goal_acceptFunc: function (c) {
		return (c == "AA");
	},
	node_0_acceptFunc: function (c) {
		return (c == "A");
	}
};

function stage_test_bootstrap(preObject) {
	preObject.goal.acceptFunc = stage_test_functions.goal_acceptFunc;
	
	preObject.nodes[0].acceptFunc = stage_test_functions.node_0_acceptFunc;
	preObject.nodes[0].fFunc = TCGLogic.CommonFunctions.AcceptFunctions.Pass;
	
	return preObject;
}