var CreepDesigner = require('function.creepDesigner')
var CreepDirector = require('object.creepDirector')
var MineralSystem = require('object.mineralSystem')
var Utils = require('utils')

module.exports = class{
  constructor(roomName){
    this.name = roomName
    this.room = Game.rooms[roomName]
    this.spawned = {}

    if(!Memory.arc[this.name]){
      Memory.arc[this.name] = {}
    }

    if(!Memory.arc[this.name].supplyJobs){
      Memory.arc[this.name].supplyJobs = []
    }

    if(!Memory.arc[this.name].purchasedResources){
      Memory.arc[this.name].purchasedResources = []
    }

    this.hostileCreeps = this.room.find(FIND_HOSTILE_CREEPS)

    // List all the sources in the room.
    //
    // Has no force key as it should never change outside of the simulator
    this.sources = Utils.inflate(this.room, 'sources', function(room){
      return room.find(FIND_SOURCES)
    })

    // List all extractors in the room
    //
    // Force if the new building key is true
    this.extractors = Utils.inflate(this.room, 'extractors', function(room){
      return room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (structure.structureType == STRUCTURE_EXTRACTOR)
        }
      })
    }, Memory.arc[this.name].newBuilding)

    // List all minerals
    this.minerals = Utils.inflate(this.room, 'minerals', function(room){
      return room.find(FIND_MINERALS)
    })

    // List all the spawns in the room
    //
    // Forced if the new building key is true
    this.spawns = Utils.inflate(this.room, 'spawns', function(room){
      return _.filter(Game.spawns, function(spawn){
        return (spawn.room.name == room.name)
      })
    }, Memory.arc[this.name].newBuilding)

    // List all the creeps in the room
    //
    // Force if a new creep has been created
    this.creeps = Utils.inflate(this.room, 'creeps', function(room){
      Memory.arc[room.name].newCreep = false

      return _.filter(Game.creeps, function(creep){
        return (
          (creep.room.name == room.name)
        )
      })
    }, true)

    // List all source containers
    //
    // Force if a new building has been built
    this.sourceContainers = Utils.inflate(this.room, 'sourceContainers', function(room){
      return room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER)
            &&
            (structure.pos.findInRange(FIND_SOURCES, 2).length > 0)
          )
        }
      })
    }, Memory.arc[this.name].newBuilding)

    // List all containers near extractors
    //
    // Force if a new building has been built
    this.extractorContainers = Utils.inflate(this.room, 'extractorContainers', function(room){
      return room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER)
            &&
            (structure.pos.findInRange(FIND_MINERALS, 2).length > 0)
          )
        }
      })
    }, Memory.arc[this.name].newBuilding)

    // List all extensions
    //
    // Force if a new building has been built
    this.extensions = Utils.inflate(this.room, 'extensions', function(room){
      return room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (structure.structureType == STRUCTURE_EXTENSION)
        }
      })
    }, Memory.arc[this.name].newBuilding)

    // Filter for spawns that are full
    this.fullSpawns = _.filter(this.spawns, function(spawn){
      if(spawn){
        return (spawn.energy == spawn.energyCapacity)
      }
    })

    // Filter for spawns that need energy
    this.notFullSpawns = _.filter(this.spawns, function(spawn){
      if(spawn){
        return (spawn.energy < spawn.energyCapacity)
      }
    })

    // Filter for extensions that are full
    this.fullExtensions = _.filter(this.extensions, function(extension){
      if(extension){
        return (extension.energy == extension.energyCapacity)
      }
    })

    // Filter for extensions that need energy
    this.notFullExtensions = _.filter(this.extensions, function(extension){
      if(extension){
        return (extension.energy < extension.energyCapacity)
      }
    })

    // List containers that normal creeps can use
    //
    // Force if a new building has been built
    this.generalUseContainers = Utils.inflate(this.room , 'generalUseContainers', function(room){
      return room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER)
            &&
            (structure.pos.findInRange(FIND_SOURCES, 2).length == 0)
            &&
            (structure.pos.findInRange(FIND_MINERALS, 2).length == 0)
            &&
            (structure.pos.findInRange(FIND_STRUCTURES, 1, {
              filter: (structure) => {
                return (structure.structureType == STRUCTURE_SPAWN)
              }
            }).length == 0)
          )
        }
      })
    }, Memory.arc[this.name].newBuilding)

    // List all towers
    //
    // Force if a new building has been built
    this.towers = Utils.inflate(this.room, 'towers', function(room){
      return room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (structure.structureType == STRUCTURE_TOWER)
        }
      })
    }, Memory.arc[this.name].newBuilding)

    // Filter towers for those that need energy
    this.notFullTowers = _.filter(this.towers, function(tower){
      if(tower){
        return (tower.energy < (tower.energyCapacity - 200))
      }
    })

    // Find all storages
    //
    // Force if a new building has been built
    this.storages = Utils.inflate(this.room, 'storages', function(room){
      return room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (structure.structureType == STRUCTURE_STORAGE)
        }
      })
    }, Memory.arc[this.name].newBuilding)

    // Find all containers near spawn for recycling
    //
    // Force if a new building has been built
    this.recycleContainers = Utils.inflate(this.room, 'recycleContainers', function(room){
      return room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER)
            &&
            (structure.pos.findInRange(FIND_STRUCTURES, 1, {
              filter: (structure) => {
                return (structure.structureType == STRUCTURE_SPAWN)
              }
            }).length != 0)
          )
        }
      })
    }, Memory.arc[this.name].newBuilding)

    // Find all labs
    //
    // Force if a new building has been built
    this.labs = Utils.inflate(this.room, 'labs', function(room){
      return room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (structure.structureType == STRUCTURE_LAB)
        }
      })
    }, Memory.arc[this.name].newBuilding)

    this.coreLinks = Utils.inflate(this.room, 'coreLinks', function(room){
      return room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            structure.structureType == STRUCTURE_LINK
            &&
            structure.pos.findInRange(FIND_EXIT, 3).length == 0
          )
        }
      })
    }, Memory.arc[this.name].newBuilding)

    this.lowCoreLinks = _.filter(this.coreLinks, function(link){
      if(link){
          return (link.energy < link.energyCapacity)
      }else{
          return false
      }
    })

    this.remoteLinks = Utils.inflate(this.room, 'remoteLinks', function(room){
      return room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            structure.structureType == STRUCTURE_LINK
            &&
            structure.pos.findInRange(FIND_EXIT, 3).length != 0
          )
        }
      })
    }, Memory.arc[this.name].newBuilding)

    this.lowRemoteLinks = _.filter(this.remoteLinks, function(link){
        if(link){
            return (link.energy < link.energyCapacity - 10)
        }else{
            return false
        }
    })

    this.remoteLinksByRoom = {}

    for(var i in this.remoteLinks){
      var link = this.remoteLinks[i]

        if(link){
            var exitFinds = [
                FIND_EXIT_TOP,
                FIND_EXIT_RIGHT,
                FIND_EXIT_BOTTOM,
                FIND_EXIT_LEFT
              ]

              var direction = 0

              for(var j in exitFinds){
                var exits = link.pos.findInRange(exitFinds[j], 3)

                if(exits.length){
                  direction = exitFinds[j]
                }
              }

      this.remoteLinksByRoom[Game.map.describeExits(this.name)[direction]] = link
        }
    }

    if(this.room.terminal){
      this.terminals = [this.room.terminal]
    }else{
      this.terminals = []
    }

    // Filter any terminals that need energy
    this.lowTerminals = _.filter(this.terminals, function(terminal){
      return (terminal.store[RESOURCE_ENERGY] < 2500)
    })

    // Find all construction sites
    this.sites = this.room.find(FIND_MY_CONSTRUCTION_SITES)

    if(this.labs.length == 3){
      this.mineralSystem = new MineralSystem(this)
      this.mineralSystem.run()
    }

    if(this.room.storage && this.room.terminal){
      this.runMarket()
    }

    this.required = {}
    this.creepsByAction = {}

    // Work out the required creep numbers
    this.required.recycle = 0
    this.required.construct = 0

    this.required.harvest = this.sources.length

    if(Memory.arc[this.name].supplyJobs.length){
      this.required.supply = 1
    }else{
      this.required.supply = 0
    }
    this.required.mineralHarvest = this.extractors.length
    this.required.upgrade = 2
    this.required.haul = this.sourceContainers.length
    this.required.interHaul = 0

    this.required.build = 0
    for(var i in this.sites){
      if(i % 10 === 0 && this.required.build < 4){
        this.required.build += 1
      }
    }

    if(this.constructMode()){
      this.required = {
        construct: this.required.build
      }
    }

    // Run the DEFCON system
    this.defcon()

    this.required.defend = 0

    if(Memory.arc[this.name].defcon >= 2){
      this.required.defend = 2
    }

    if(Memory.arc[this.name].defcon >= 4){
      this.required.defend = 4
    }

    this.actions = Object.keys(this.required)
    for(var i in this.actions){
      var action = this.actions[i]

      this.countAndEnsureNumbers(action)
    }

    Memory.arc[this.name].newBuilding = false

    this.director = new CreepDirector(this)
    this.director.runCreeps()

    for(var i in this.towers){
      var tower = this.towers[i]

      if(tower){
        this.runTower(tower)
      }
    }

    for(var i in this.coreLinks){
      var link = this.coreLinks[i]

      if(link){
        this.runLink(link)
      }
    }
  }

  countAndEnsureNumbers(action){
    this.creepsByAction[action] = _.filter(this.creeps, function(creep){
      return (creep.memory.action == action)
    })

    if(this.creepsByAction[action].length < this.required[action]){
      this.buildCreep(action)
    }
  }

  buildCreep(action){
    var creepDesign = CreepDesigner.createCreep({
      base: CreepDesigner.baseDesign[action],
      room: this.room,
      canAffordOnly: ((action == 'haul' && this.creepsByAction['haul'].length == 0) || (action == 'harvest' && this.creepsByAction['harvest'].length == 0 )),
      cap: CreepDesigner.caps[action]
    })

    var spawn = this.getSpawn()

    if(spawn){
      this.spawned[spawn.id] = true
      var newName = spawn.createCreep(creepDesign, undefined, {action: action})
      console.log('Adding ' + newName + ' (' + action + ') to the spawn queue in ' + this.name)
      Memory.arc[this.name].newCreep = true
    }
  }

  getSpawn(){
    for(var i in this.spawns){
      if(this.spawns[i]){
        if(!this.spawns[i].spawning && !(this.spawned[this.spawns[i].id])){
          return this.spawns[i]
        }
      }
    }

    return false
  }

  runTower(tower){
    var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
    if(closestHostile){
      tower.attack(closestHostile)
    }else{
      var repairTargets = tower.pos.findInRange(FIND_STRUCTURES, 40, {
        filter: function(structure){
          if(structure.structureType == STRUCTURE_WALL || structure.structureType == STRUCTURE_RAMPART){
            return (structure.hits < 100000)
          }else{
            return (structure.hits < structure.hitsMax)
          }
        }
      })

      if(repairTargets.length){
        repairTargets.sort(function(a, b){
          return a.hits - b.hits
        })

        tower.repair(repairTargets[0])
      }
    }
  }

  runMarket(){
    for(var resource in this.room.storage.store){
      if(resource != RESOURCE_ENERGY){
        this.createSupplyJob({
          source: this.room.storage.id,
          dest: this.room.terminal.id,
          resource: resource
        })
      }
    }

    if(this.recycleContainers[0]){
      for(var resource in this.recycleContainers[0].store){
        if(resource != RESOURCE_ENERGY){
          this.createSupplyJob({
            source: this.recycleContainers[0].id,
            dest: this.room.storage.id,
            resource: resource
          })
        }
      }
    }

    for(var resource in this.room.terminal.store){
      if(resource != RESOURCE_ENERGY && !Memory.arc[this.name].purchasedResources.includes(resource)){
        this.marketDeal(resource)
      }
    }
  }

  buyResource(resource, total){
    if(this.room.terminal){
      if(this.room.terminal.store[resource] < total){
        var order = {price: 10000}
        var orders = Game.market.getAllOrders({resourceType: resource, type: ORDER_SELL})
        for(var i in orders){
          var cost = Game.market.calcTransactionCost(
            500,
            this.name,
            orders[i].roomName
          )

          if(cost < 2500 && orders[i].price < order.price){
            order = orders[i]
            order.cost = cost
          }
        }

        if(order.cost < 2500){
          if(this.room.terminal.store[RESOURCE_ENERGY] > order.cost){
            console.log('buy 500 ' + resource + ' from ' + order.roomName + ' costing ' + (order.price * 500))
            var response = Game.market.deal(order.id, 500, this.name)
            console.log(response)
            if(!Memory.arc[this.name].purchasedResources.includes(resource)){
              Memory.arc[this.name].purchasedResources.push(resource)
            }
          }
        }
      }
    }
  }

  marketDeal(resource){
    var order = {cost: 10000}
    var orders = Game.market.getAllOrders({resourceType: resource, type: ORDER_BUY})
    for(var i in orders){
      var cost = Game.market.calcTransactionCost(
        Math.min(orders[i].amount, this.room.terminal.store[resource]),
        this.name,
        orders[i].roomName
      )
      if(cost < order.cost){
        order = orders[i]
        order.cost = cost
      }
    }

    if(order.cost > 2500){
      var amount = Math.min(order.amount, this.room.terminal.store[resource])
      while(order.cost > 2500 && amount > 1){
        amount -= 100
        order.cost = Game.market.calcTransactionCost(
          amount,
          this.name,
          order.roomName
        )
      }

      order.amount = amount
    }

    if(this.room.terminal.store[RESOURCE_ENERGY] > order.cost){
      Game.market.deal(order.id, Math.min(order.amount, this.room.terminal.store[resource]), this.name)
    }
  }

  createSupplyJob(job){
    var matchingJobs = _.filter(Memory.arc[this.name].supplyJobs, function(j){
      return (_.isEqual(j, job))
    })

    if(!matchingJobs.length){
      Memory.arc[this.name].supplyJobs.push(job)
    }
  }

  removeSupplyJob(){
    Memory.arc[this.name].supplyJobs.shift()
  }

  constructMode(){
    if(this.room.energyAvailable < 300){
      return true
    }

    return false
  }

  needsSupport(){
    if(this.room.controller){
      if(this.spawns.length == 0 && this.room.controller.my){
        return true
      }

      if(this.room.energyCapacityAvailable < 400 && this.room.controller.my){
        return true
      }
    }

    return false
  }

  canSupport(){
    return (this.room.energyAvailable == this.room.energyCapacityAvailable)
  }

  sendEnergy(){
    if(this.room.controller){
      if(!Memory.arc[this.name].energyAverage){
        Memory.arc[this.name].energyAverage = []
      }

      Memory.arc[this.name].energyAverage.push(this.room.energyAvailable)

      if(Memory.arc[this.name].energyAverage.length > 50){
        Memory.arc[this.name].energyAverage.shift()
      }

      var averageEnergy = _.sum(Memory.arc[this.name].energyAverage) / Memory.arc[this.name].energyAverage.length

      if((this.room.energyCapacityAvailable < 1000 || averageEnergy < 500) && this.room.controller.my){
        return true
      }
    }

    return false
  }

  runLink(link){
     if(link.cooldown == 0 && link.energy > 0 && this.lowRemoteLinks.length > 0){
       var toSend = this.lowRemoteLinks[0].energyCapacity - this.lowRemoteLinks[0].energy
       if(toSend > link.energy){
         var toSend = link.energy
       }

       link.transferEnergy(this.lowRemoteLinks[0], toSend)
     }
  }

  defcon(){
    if(!Memory.arc[this.name].defcon){
      Memory.arc[this.name].defcon = 0
      Memory.arc[this.name].atDefcon = 0
    }

    if(this.hostileCreeps.length == 0){
      Memory.arc[this.name].defcon = 0
      Memory.arc[this.name].atDefcon = 0
    }

    if(this.hostileCreeps.length > 0 && this.hostileCreeps.length < 4){
      Memory.arc[this.name].defcon = 1
    }

    if(this.hostileCreeps.length > 4){
      Memory.arc[this.name].defcon = 3
    }

    if(this.hostileCreeps.length > 10){
      Memory.arc[this.name].defcon = 4
    }

    if(Memory.arc[this.name].defcon == 0){
      Memory.arc[this.name].atDefcon = 0
    }else{
      Memory.arc[this.name].atDefcon += 1
    }

    if(Memory.arc[this.name].atDefcon == 50 && Memory.arc[this.name].defcon == 1){
      Memory.arc[this.name].defcon = 2
      Memory.arc[this.name].atDefcon = 0
    }

    if(Memory.arc[this.name].atDefcon == 50){
      Memory.arc[this.name].newBuilding = true
      this.room.controller.activateSafeMode()
    }else{
      if(!Memory.arc[this.name].structureCount){
        Memory.arc[this.name].structureCount = 0
      }

      if(Memory.arc[this.name].defcon > 0){
        var newCount = this.room.find(FIND_STRUCTURES).length

        if(newCount < Memory.arc[this.name].structureCount){
          this.room.controller.activateSafeMode()
        }else{
          Memory.arc[this.name].structureCount = newCount
        }
      }
    }
  }
}
