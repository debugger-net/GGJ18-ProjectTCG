// GGJ 2018
// Project TCG - Logic Implementation
// by Debugger


////////////////////////////////////////////////////////////////////////////////
// Logic Module
////////////////////////////////////////////////////////////////////////////////
var TCGLogic = {
	
	Types: {
		NodeId: {
			// Special Ids
			START: -1, 
			GOAL: -2, 
			GLOBAL_INPUT_X: -10, 
			GLOBAL_INPUT_Y: -11, 
			
			// Type Functions
			ToNodeIndex: function (id) {
				if (id < 0)
				{
					return null;
				}
				return id;
			},
			
			IsNormalNode: function(id) {
				return (id >= 0);
			}
		}, 
		PresentatioEventType: {
			// Values
			PROCESS: 1, 
			OUTPUT: 2
		}, 
		FunctionInfoType: {
			// Values
			BLACK_BOX: 0, 
			PASS: 1, 
			BLOCK: 2, 
			EMPTY: 3, 
			WORD: 10, 
			EXACT_STRING: 20, 
			REGULAR_EXPRESSION: 21, 
			PATTERN: 22, 
			PSEUDO_CODE: 30
		}
	},
	
	Constants: {
		BUFFER_END: "\0"
	}, 
	
	
	CommonFunctions: {
		
		AcceptFunctions: {
			Pass: function () {
				return true;
			}, 
			Block: function () {
				return false;
			},
			Empty: function (c) {
				return (c == "");
			}
		}, 
		
		OutputFunctions: {
			Pass: function (c) {
				return c;
			}, 
			Block: function () {
				return "";
			},
			Empty: function () {
				return TCGLogic.Constants.BUFFER_END;
			}
		}
	}, 
	
	
	// Generate Initial Context of given stage
	GenerateInitialContext: function (stage) {
		var creatingContext = {};
		
		creatingContext.goalBuffer = "";
		
		var nodeCount = stage.nodes.length;
		creatingContext.nodeInstances = [];
		for (var i = 0; i < nodeCount; i++)
		{
			var currentNodeData = stage.nodes[i];
			var nodeInstance = {};
			
			if (currentNodeData.stateHas)
			{
				nodeInstance.state = currentNodeData.stateInitial;
			}
			else
			{
				nodeInstance.state = false;
			}
			
			if (typeof nodeInstance.xBufferSize != "undefined")
			{
				nodeInstance.xBuffer = "";
			}
			if (typeof nodeInstance.yBufferSize != "undefined")
			{
				nodeInstance.yBuffer = "";
			}
			
			creatingContext.nodeInstances.push(nodeInstance);
		}
		
		return creatingContext;
	}, 
	
	// Proceed One Step
	GoStep: function (stage, code, context) {
		var stepResult = {};
		
		stepResult.currentContext = context;
		stepResult.presentationEvents = [];
		stepResult.resultFlags = {
			isError: false, 
			isCleared: false, 
			isStucked: false
		};
		
		// Process Start Node
		
		// Process Normal Nodes
		var orderedNodeList = this._Internal.GenerateDependencyOrderedNodeList(stage);
		var nodeListLength = orderedNodeList.length;
		for (var i = 0; i < nodeListLength; i++)
		{
		}
		
		// Judge Goal
		
		// ****Implementing
		// Iterate stage's nodes and build dependency graph
		// Make node iterate list from dependency graph
		// for (start node + node iterate list) in order
		//   - check is need to judge - clock
		//   - dequeue tokens from buffers
		//   - Run Accept Function -> bake ProcessEvent
		//     - if Accepted, Run Output Functions 
		//       bake OutputEvents if output going
		//       update context <- enqueue output to destination's buffer
		// * check stuck - no node updated
		// check goal and judge
		
		return stepResult;
	},
	
	
	_Internal: {
		GenerateDependencyOrderedNodeList: function (stage) {
			var nodeCount = stage.nodes.length;
			
			// Initialize Dependency List
			var dependencyList = [];
			for (var i = 0; i < nodeCount; i++)
			{
				var currentNodeData = stage.nodes[i];
				var dependencyEntry = {
					nodeIndex: i,
					isRemoved: false, 
					dependsOnList: []
				};
				
				if (typeof nodeInstance.xBufferSize != "undefined")
				{
					if (TCGLogic.Types.NodeId.IsNormalNode(nodeInstance.xFromId))
					{
						dependencyEntry.dependsOnList.push(TCGLogic.Types.NodeId.ToNodeIndex(nodeInstance.xFromId));
					}
				}
				if (typeof nodeInstance.yBufferSize != "undefined")
				{
					if (TCGLogic.Types.NodeId.IsNormalNode(nodeInstance.yFromId))
					{
						dependencyEntry.dependsOnList.push(TCGLogic.Types.NodeId.ToNodeIndex(nodeInstance.yFromId));
					}
				}
				
				dependencyList.push(dependencyEntry);
			}
			
			// Build Ordered List
			var orderedNodeList = [];
			while (orderedNodeList.length < nodeCount)
			{
				for (var i = 0; i < nodeCount; i++)
				{
					if (dependencyList[i].isRemoved)
					{
						continue;
					}
					
					if (dependencyList[i].dependsOnList.length > 0)
					{
						continue;
					}
					
					// Independent node now
					orderedNodeList.push(stage.nodes[dependencyList[i].nodeIndex]);
					
					
					// ****Implementing
					
					
					// Remove My Dependency
					for (var j = 0; j < nodeCount; j++)
					{
						if (dependencyList[j].isRemoved)
						{
							continue;
						}
						var isDependsOnMe = false;
						for (var k = 0; k < dependencyList[j].dependsOnList.length; k++)
						{
							if (dependencyList[j].dependsOnList[k] == i)
							{
								isDependsOnMe = true;
								break;
							}
						}
						if (isDependsOnMe)
						{
							dependencyList[j].dependsOnList = GetRemovedFromJSArray(dependencyList[i].dependsOnList, i);
						}
					}
				}
			}
			
			return orderedNodeList;
		}, 
		
		GetRemovedFromJSArray: function (sourceArray, itemValue) {
			var arrayLength = sourceArray.length;
			
			var resultArray = [];
			for (var i = 0; i < arrayLength; i++)
			{
				if (sourceArray[i] == itemValue)
				{
					continue;
				}
				resultArray.push(sourceArray[i]);
			}
			
			return resultArray;
		}
	}
};


////////////////////////////////////////////////////////////////////////////////
// Global Utility Functions
////////////////////////////////////////////////////////////////////////////////

// Return Buffer End Special Alphabet
function E() {
	return TCGLogic.Constants.BUFFER_END;
}
