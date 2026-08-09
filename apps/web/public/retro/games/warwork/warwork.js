var pas = {};

var rtl = {

  version: 10501,

  quiet: false,
  debug_load_units: false,
  debug_rtti: false,

  $res : {},

  debug: function(){
    if (rtl.quiet || !console || !console.log) return;
    console.log(arguments);
  },

  error: function(s){
    rtl.debug('Error: ',s);
    throw s;
  },

  warn: function(s){
    rtl.debug('Warn: ',s);
  },

  checkVersion: function(v){
    if (rtl.version != v) throw "expected rtl version "+v+", but found "+rtl.version;
  },

  hiInt: Math.pow(2,53),

  hasString: function(s){
    return rtl.isString(s) && (s.length>0);
  },

  isArray: function(a) {
    return Array.isArray(a);
  },

  isFunction: function(f){
    return typeof(f)==="function";
  },

  isModule: function(m){
    return rtl.isObject(m) && rtl.hasString(m.$name) && (pas[m.$name]===m);
  },

  isImplementation: function(m){
    return rtl.isObject(m) && rtl.isModule(m.$module) && (m.$module.$impl===m);
  },

  isNumber: function(n){
    return typeof(n)==="number";
  },

  isObject: function(o){
    var s=typeof(o);
    return (typeof(o)==="object") && (o!=null);
  },

  isString: function(s){
    return typeof(s)==="string";
  },

  getNumber: function(n){
    return typeof(n)==="number"?n:NaN;
  },

  getChar: function(c){
    return ((typeof(c)==="string") && (c.length===1)) ? c : "";
  },

  getObject: function(o){
    return ((typeof(o)==="object") || (typeof(o)==='function')) ? o : null;
  },

  isTRecord: function(type){
    return (rtl.isObject(type) && type.hasOwnProperty('$new') && (typeof(type.$new)==='function'));
  },

  isPasClass: function(type){
    return (rtl.isObject(type) && type.hasOwnProperty('$classname') && rtl.isObject(type.$module));
  },

  isPasClassInstance: function(type){
    return (rtl.isObject(type) && rtl.isPasClass(type.$class));
  },

  hexStr: function(n,digits){
    return ("000000000000000"+n.toString(16).toUpperCase()).slice(-digits);
  },

  m_loading: 0,
  m_loading_intf: 1,
  m_intf_loaded: 2,
  m_loading_impl: 3, // loading all used unit
  m_initializing: 4, // running initialization
  m_initialized: 5,

  module: function(module_name, intfuseslist, intfcode, impluseslist, implcode){
    if (rtl.debug_load_units) rtl.debug('rtl.module name="'+module_name+'" intfuses='+intfuseslist+' impluses='+impluseslist+' hasimplcode='+rtl.isFunction(implcode));
    if (!rtl.hasString(module_name)) rtl.error('invalid module name "'+module_name+'"');
    if (!rtl.isArray(intfuseslist)) rtl.error('invalid interface useslist of "'+module_name+'"');
    if (!rtl.isFunction(intfcode)) rtl.error('invalid interface code of "'+module_name+'"');
    if (!(impluseslist==undefined) && !rtl.isArray(impluseslist)) rtl.error('invalid implementation useslist of "'+module_name+'"');
    if (!(implcode==undefined) && !rtl.isFunction(implcode)) rtl.error('invalid implementation code of "'+module_name+'"');

    if (pas[module_name])
      rtl.error('module "'+module_name+'" is already registered');

    var module = pas[module_name] = {
      $name: module_name,
      $intfuseslist: intfuseslist,
      $impluseslist: impluseslist,
      $state: rtl.m_loading,
      $intfcode: intfcode,
      $implcode: implcode,
      $impl: null,
      $rtti: Object.create(rtl.tSectionRTTI)
    };
    module.$rtti.$module = module;
    if (implcode) module.$impl = {
      $module: module,
      $rtti: module.$rtti
    };
  },

  exitcode: 0,

  run: function(module_name){
    try {
      if (!rtl.hasString(module_name)) module_name='program';
      if (rtl.debug_load_units) rtl.debug('rtl.run module="'+module_name+'"');
      rtl.initRTTI();
      var module = pas[module_name];
      if (!module) rtl.error('rtl.run module "'+module_name+'" missing');
      rtl.loadintf(module);
      rtl.loadimpl(module);
      if (module_name=='program'){
        if (rtl.debug_load_units) rtl.debug('running $main');
        var r = pas.program.$main();
        if (rtl.isNumber(r)) rtl.exitcode = r;
      }
    } catch(re) {
      if (!rtl.showUncaughtExceptions) {
        throw re
      } else {  
        if (!rtl.handleUncaughtException(re)) {
          rtl.showException(re);
          rtl.exitcode = 216;
        }  
      }
    } 
    return rtl.exitcode;
  },
  
  showException : function (re) {
    var errMsg = rtl.hasString(re.$classname) ? re.$classname : '';
    errMsg +=  ((errMsg) ? ': ' : '') + (re.hasOwnProperty('fMessage') ? re.fMessage : re);
    alert('Uncaught Exception : '+errMsg);
  },

  handleUncaughtException: function (e) {
    if (rtl.onUncaughtException) {
      try {
        rtl.onUncaughtException(e);
        return true;
      } catch (ee) {
        return false; 
      }
    } else {
      return false;
    }
  },

  loadintf: function(module){
    if (module.$state>rtl.m_loading_intf) return; // already finished
    if (rtl.debug_load_units) rtl.debug('loadintf: "'+module.$name+'"');
    if (module.$state===rtl.m_loading_intf)
      rtl.error('unit cycle detected "'+module.$name+'"');
    module.$state=rtl.m_loading_intf;
    // load interfaces of interface useslist
    rtl.loaduseslist(module,module.$intfuseslist,rtl.loadintf);
    // run interface
    if (rtl.debug_load_units) rtl.debug('loadintf: run intf of "'+module.$name+'"');
    module.$intfcode(module.$intfuseslist);
    // success
    module.$state=rtl.m_intf_loaded;
    // Note: units only used in implementations are not yet loaded (not even their interfaces)
  },

  loaduseslist: function(module,useslist,f){
    if (useslist==undefined) return;
    var len = useslist.length;
    for (var i = 0; i<len; i++) {
      var unitname=useslist[i];
      if (rtl.debug_load_units) rtl.debug('loaduseslist of "'+module.$name+'" uses="'+unitname+'"');
      if (pas[unitname]==undefined)
        rtl.error('module "'+module.$name+'" misses "'+unitname+'"');
      f(pas[unitname]);
    }
  },

  loadimpl: function(module){
    if (module.$state>=rtl.m_loading_impl) return; // already processing
    if (module.$state<rtl.m_intf_loaded) rtl.error('loadimpl: interface not loaded of "'+module.$name+'"');
    if (rtl.debug_load_units) rtl.debug('loadimpl: load uses of "'+module.$name+'"');
    module.$state=rtl.m_loading_impl;
    // load interfaces of implementation useslist
    rtl.loaduseslist(module,module.$impluseslist,rtl.loadintf);
    // load implementation of interfaces useslist
    rtl.loaduseslist(module,module.$intfuseslist,rtl.loadimpl);
    // load implementation of implementation useslist
    rtl.loaduseslist(module,module.$impluseslist,rtl.loadimpl);
    // Note: At this point all interfaces used by this unit are loaded. If
    //   there are implementation uses cycles some used units might not yet be
    //   initialized. This is by design.
    // run implementation
    if (rtl.debug_load_units) rtl.debug('loadimpl: run impl of "'+module.$name+'"');
    if (rtl.isFunction(module.$implcode)) module.$implcode(module.$impluseslist);
    // run initialization
    if (rtl.debug_load_units) rtl.debug('loadimpl: run init of "'+module.$name+'"');
    module.$state=rtl.m_initializing;
    if (rtl.isFunction(module.$init)) module.$init();
    // unit initialized
    module.$state=rtl.m_initialized;
  },

  createCallback: function(scope, fn){
    var cb;
    if (typeof(fn)==='string'){
      cb = function(){
        return scope[fn].apply(scope,arguments);
      };
    } else {
      cb = function(){
        return fn.apply(scope,arguments);
      };
    };
    cb.scope = scope;
    cb.fn = fn;
    return cb;
  },

  createSafeCallback: function(scope, fn){
    var cb = function(){
      try{
        if (typeof(fn)==='string'){
          return scope[fn].apply(scope,arguments);
        } else {
          return fn.apply(scope,arguments);
        };
      } catch (err) {
        if (!rtl.handleUncaughtException(err)) throw err;
      }
    };
    cb.scope = scope;
    cb.fn = fn;
    return cb;
  },

  cloneCallback: function(cb){
    return rtl.createCallback(cb.scope,cb.fn);
  },

  eqCallback: function(a,b){
    // can be a function or a function wrapper
    if (a==b){
      return true;
    } else {
      return (a!=null) && (b!=null) && (a.fn) && (a.scope===b.scope) && (a.fn==b.fn);
    }
  },

  initStruct: function(c,parent,name){
    if ((parent.$module) && (parent.$module.$impl===parent)) parent=parent.$module;
    c.$parent = parent;
    if (rtl.isModule(parent)){
      c.$module = parent;
      c.$name = name;
    } else {
      c.$module = parent.$module;
      c.$name = parent.$name+'.'+name;
    };
    return parent;
  },

  initClass: function(c,parent,name,initfn){
    parent[name] = c;
    c.$class = c; // Note: o.$class === Object.getPrototypeOf(o)
    c.$classname = name;
    parent = rtl.initStruct(c,parent,name);
    c.$fullname = parent.$name+'.'+name;
    // rtti
    if (rtl.debug_rtti) rtl.debug('initClass '+c.$fullname);
    var t = c.$module.$rtti.$Class(c.$name,{ "class": c });
    c.$rtti = t;
    if (rtl.isObject(c.$ancestor)) t.ancestor = c.$ancestor.$rtti;
    if (!t.ancestor) t.ancestor = null;
    // init members
    initfn.call(c);
  },

  createClass: function(parent,name,ancestor,initfn){
    // create a normal class,
    // ancestor must be null or a normal class,
    // the root ancestor can be an external class
    var c = null;
    if (ancestor != null){
      c = Object.create(ancestor);
      c.$ancestor = ancestor;
      // Note:
      // if root is an "object" then c.$ancestor === Object.getPrototypeOf(c)
      // if root is a "function" then c.$ancestor === c.__proto__, Object.getPrototypeOf(c) returns the root
    } else {
      c = { $ancestor: null };
      c.$create = function(fn,args){
        if (args == undefined) args = [];
        var o = Object.create(this);
        o.$init();
        try{
          if (typeof(fn)==="string"){
            o[fn].apply(o,args);
          } else {
            fn.apply(o,args);
          };
          o.AfterConstruction();
        } catch($e){
          // do not call BeforeDestruction
          if (o.Destroy) o.Destroy();
          o.$final();
          throw $e;
        }
        return o;
      };
      c.$destroy = function(fnname){
        this.BeforeDestruction();
        if (this[fnname]) this[fnname]();
        this.$final();
      };
    };
    rtl.initClass(c,parent,name,initfn);
  },

  createClassExt: function(parent,name,ancestor,newinstancefnname,initfn){
    // Create a class using an external ancestor.
    // If newinstancefnname is given, use that function to create the new object.
    // If exist call BeforeDestruction and AfterConstruction.
    var isFunc = rtl.isFunction(ancestor);
    var c = null;
    if (isFunc){
      // create pascal class descendent from JS function
      c = Object.create(ancestor.prototype);
    } else if (ancestor.$func){
      // create pascal class descendent from a pascal class descendent of a JS function
      isFunc = true;
      c = Object.create(ancestor);
      c.$ancestor = ancestor;
    } else {
      c = Object.create(ancestor);
    }
    c.$create = function(fn,args){
      if (args == undefined) args = [];
      var o = null;
      if (newinstancefnname.length>0){
        o = this[newinstancefnname](fn,args);
      } else if(isFunc) {
        o = new this.$func(args);
      } else {
        o = Object.create(c);
      }
      if (o.$init) o.$init();
      try{
        if (typeof(fn)==="string"){
          this[fn].apply(o,args);
        } else {
          fn.apply(o,args);
        };
        if (o.AfterConstruction) o.AfterConstruction();
      } catch($e){
        // do not call BeforeDestruction
        if (o.Destroy) o.Destroy();
        if (o.$final) o.$final();
        throw $e;
      }
      return o;
    };
    c.$destroy = function(fnname){
      if (this.BeforeDestruction) this.BeforeDestruction();
      if (this[fnname]) this[fnname]();
      if (this.$final) this.$final();
    };
    rtl.initClass(c,parent,name,initfn);
    if (isFunc){
      function f(){}
      f.prototype = c;
      c.$func = f;
      c.$ancestorfunc = ancestor;
    }
  },

  createHelper: function(parent,name,ancestor,initfn){
    // create a helper,
    // ancestor must be null or a helper,
    var c = null;
    if (ancestor != null){
      c = Object.create(ancestor);
      c.$ancestor = ancestor;
      // c.$ancestor === Object.getPrototypeOf(c)
    } else {
      c = { $ancestor: null };
    };
    parent[name] = c;
    c.$class = c; // Note: o.$class === Object.getPrototypeOf(o)
    c.$classname = name;
    parent = rtl.initStruct(c,parent,name);
    c.$fullname = parent.$name+'.'+name;
    // rtti
    var t = c.$module.$rtti.$Helper(c.$name,{ "helper": c });
    c.$rtti = t;
    if (rtl.isObject(ancestor)) t.ancestor = ancestor.$rtti;
    if (!t.ancestor) t.ancestor = null;
    // init members
    initfn.call(c);
  },

  tObjectDestroy: "Destroy",

  free: function(obj,name){
    if (obj[name]==null) return null;
    obj[name].$destroy(rtl.tObjectDestroy);
    obj[name]=null;
  },

  freeLoc: function(obj){
    if (obj==null) return null;
    obj.$destroy(rtl.tObjectDestroy);
    return null;
  },

  hideProp: function(o,p,v){
    Object.defineProperty(o,p, {
      enumerable: false,
      configurable: true,
      writable: true
    });
    if(arguments.length>2){ o[p]=v; }
  },

  recNewT: function(parent,name,initfn,full){
    // create new record type
    var t = {};
    if (parent) parent[name] = t;
    var h = rtl.hideProp;
    if (full){
      rtl.initStruct(t,parent,name);
      t.$record = t;
      h(t,'$record');
      h(t,'$name');
      h(t,'$parent');
      h(t,'$module');
    }
    initfn.call(t);
    if (!t.$new){
      t.$new = function(){ return Object.create(t); };
    }
    t.$clone = function(r){ return t.$new().$assign(r); };
    h(t,'$new');
    h(t,'$clone');
    h(t,'$eq');
    h(t,'$assign');
    return t;
  },

  is: function(instance,type){
    return type.isPrototypeOf(instance) || (instance===type);
  },

  isExt: function(instance,type,mode){
    // mode===1 means instance must be a Pascal class instance
    // mode===2 means instance must be a Pascal class
    // Notes:
    // isPrototypeOf and instanceof return false on equal
    // isPrototypeOf does not work for Date.isPrototypeOf(new Date())
    //   so if isPrototypeOf is false test with instanceof
    // instanceof needs a function on right side
    if (instance == null) return false; // Note: ==null checks for undefined too
    if ((typeof(type) !== 'object') && (typeof(type) !== 'function')) return false;
    if (instance === type){
      if (mode===1) return false;
      if (mode===2) return rtl.isPasClass(instance);
      return true;
    }
    if (type.isPrototypeOf && type.isPrototypeOf(instance)){
      if (mode===1) return rtl.isPasClassInstance(instance);
      if (mode===2) return rtl.isPasClass(instance);
      return true;
    }
    if ((typeof type == 'function') && (instance instanceof type)) return true;
    return false;
  },

  Exception: null,
  EInvalidCast: null,
  EAbstractError: null,
  ERangeError: null,
  EIntOverflow: null,
  EPropWriteOnly: null,

  raiseE: function(typename){
    var t = rtl[typename];
    if (t==null){
      var mod = pas.SysUtils;
      if (!mod) mod = pas.sysutils;
      if (mod){
        t = mod[typename];
        if (!t) t = mod[typename.toLowerCase()];
        if (!t) t = mod['Exception'];
        if (!t) t = mod['exception'];
      }
    }
    if (t){
      if (t.Create){
        throw t.$create("Create");
      } else if (t.create){
        throw t.$create("create");
      }
    }
    if (typename === "EInvalidCast") throw "invalid type cast";
    if (typename === "EAbstractError") throw "Abstract method called";
    if (typename === "ERangeError") throw "range error";
    throw typename;
  },

  as: function(instance,type){
    if((instance === null) || rtl.is(instance,type)) return instance;
    rtl.raiseE("EInvalidCast");
  },

  asExt: function(instance,type,mode){
    if((instance === null) || rtl.isExt(instance,type,mode)) return instance;
    rtl.raiseE("EInvalidCast");
  },

  createInterface: function(module, name, guid, fnnames, ancestor, initfn){
    //console.log('createInterface name="'+name+'" guid="'+guid+'" names='+fnnames);
    var i = ancestor?Object.create(ancestor):{};
    module[name] = i;
    i.$module = module;
    i.$name = name;
    i.$fullname = module.$name+'.'+name;
    i.$guid = guid;
    i.$guidr = null;
    i.$names = fnnames?fnnames:[];
    if (rtl.isFunction(initfn)){
      // rtti
      if (rtl.debug_rtti) rtl.debug('createInterface '+i.$fullname);
      var t = i.$module.$rtti.$Interface(name,{ "interface": i, module: module });
      i.$rtti = t;
      if (ancestor) t.ancestor = ancestor.$rtti;
      if (!t.ancestor) t.ancestor = null;
      initfn.call(i);
    }
    return i;
  },

  strToGUIDR: function(s,g){
    var p = 0;
    function n(l){
      var h = s.substr(p,l);
      p+=l;
      return parseInt(h,16);
    }
    p+=1; // skip {
    g.D1 = n(8);
    p+=1; // skip -
    g.D2 = n(4);
    p+=1; // skip -
    g.D3 = n(4);
    p+=1; // skip -
    if (!g.D4) g.D4=[];
    g.D4[0] = n(2);
    g.D4[1] = n(2);
    p+=1; // skip -
    for(var i=2; i<8; i++) g.D4[i] = n(2);
    return g;
  },

  guidrToStr: function(g){
    if (g.$intf) return g.$intf.$guid;
    var h = rtl.hexStr;
    var s='{'+h(g.D1,8)+'-'+h(g.D2,4)+'-'+h(g.D3,4)+'-'+h(g.D4[0],2)+h(g.D4[1],2)+'-';
    for (var i=2; i<8; i++) s+=h(g.D4[i],2);
    s+='}';
    return s;
  },

  createTGUID: function(guid){
    var TGuid = (pas.System)?pas.System.TGuid:pas.system.tguid;
    var g = rtl.strToGUIDR(guid,TGuid.$new());
    return g;
  },

  getIntfGUIDR: function(intfTypeOrVar){
    if (!intfTypeOrVar) return null;
    if (!intfTypeOrVar.$guidr){
      var g = rtl.createTGUID(intfTypeOrVar.$guid);
      if (!intfTypeOrVar.hasOwnProperty('$guid')) intfTypeOrVar = Object.getPrototypeOf(intfTypeOrVar);
      g.$intf = intfTypeOrVar;
      intfTypeOrVar.$guidr = g;
    }
    return intfTypeOrVar.$guidr;
  },

  addIntf: function (aclass, intf, map){
    function jmp(fn){
      if (typeof(fn)==="function"){
        return function(){ return fn.apply(this.$o,arguments); };
      } else {
        return function(){ rtl.raiseE('EAbstractError'); };
      }
    }
    if(!map) map = {};
    var t = intf;
    var item = Object.create(t);
    if (!aclass.hasOwnProperty('$intfmaps')) aclass.$intfmaps = {};
    aclass.$intfmaps[intf.$guid] = item;
    do{
      var names = t.$names;
      if (!names) break;
      for (var i=0; i<names.length; i++){
        var intfname = names[i];
        var fnname = map[intfname];
        if (!fnname) fnname = intfname;
        //console.log('addIntf: intftype='+t.$name+' index='+i+' intfname="'+intfname+'" fnname="'+fnname+'" old='+typeof(item[intfname]));
        item[intfname] = jmp(aclass[fnname]);
      }
      t = Object.getPrototypeOf(t);
    }while(t!=null);
  },

  getIntfG: function (obj, guid, query){
    if (!obj) return null;
    //console.log('getIntfG: obj='+obj.$classname+' guid='+guid+' query='+query);
    // search
    var maps = obj.$intfmaps;
    if (!maps) return null;
    var item = maps[guid];
    if (!item) return null;
    // check delegation
    //console.log('getIntfG: obj='+obj.$classname+' guid='+guid+' query='+query+' item='+typeof(item));
    if (typeof item === 'function') return item.call(obj); // delegate. Note: COM contains _AddRef
    // check cache
    var intf = null;
    if (obj.$interfaces){
      intf = obj.$interfaces[guid];
      //console.log('getIntfG: obj='+obj.$classname+' guid='+guid+' cache='+typeof(intf));
    }
    if (!intf){ // intf can be undefined!
      intf = Object.create(item);
      intf.$o = obj;
      if (!obj.$interfaces) obj.$interfaces = {};
      obj.$interfaces[guid] = intf;
    }
    if (typeof(query)==='object'){
      // called by queryIntfT
      var o = null;
      if (intf.QueryInterface(rtl.getIntfGUIDR(query),
          {get:function(){ return o; }, set:function(v){ o=v; }}) === 0){
        return o;
      } else {
        return null;
      }
    } else if(query===2){
      // called by TObject.GetInterfaceByStr
      if (intf.$kind === 'com') intf._AddRef();
    }
    return intf;
  },

  getIntfT: function(obj,intftype){
    return rtl.getIntfG(obj,intftype.$guid);
  },

  queryIntfT: function(obj,intftype){
    return rtl.getIntfG(obj,intftype.$guid,intftype);
  },

  queryIntfIsT: function(obj,intftype){
    var i = rtl.getIntfG(obj,intftype.$guid);
    if (!i) return false;
    if (i.$kind === 'com') i._Release();
    return true;
  },

  asIntfT: function (obj,intftype){
    var i = rtl.getIntfG(obj,intftype.$guid);
    if (i!==null) return i;
    rtl.raiseEInvalidCast();
  },

  intfIsIntfT: function(intf,intftype){
    return (intf!==null) && rtl.queryIntfIsT(intf.$o,intftype);
  },

  intfAsIntfT: function (intf,intftype){
    if (intf){
      var i = rtl.getIntfG(intf.$o,intftype.$guid);
      if (i!==null) return i;
    }
    rtl.raiseEInvalidCast();
  },

  intfIsClass: function(intf,classtype){
    return (intf!=null) && (rtl.is(intf.$o,classtype));
  },

  intfAsClass: function(intf,classtype){
    if (intf==null) return null;
    return rtl.as(intf.$o,classtype);
  },

  intfToClass: function(intf,classtype){
    if ((intf!==null) && rtl.is(intf.$o,classtype)) return intf.$o;
    return null;
  },

  // interface reference counting
  intfRefs: { // base object for temporary interface variables
    ref: function(id,intf){
      // called for temporary interface references needing delayed release
      var old = this[id];
      //console.log('rtl.intfRefs.ref: id='+id+' old="'+(old?old.$name:'null')+'" intf="'+(intf?intf.$name:'null')+' $o='+(intf?intf.$o:'null'));
      if (old){
        // called again, e.g. in a loop
        delete this[id];
        old._Release(); // may fail
      }
      this[id]=intf;
      return intf;
    },
    free: function(){
      //console.log('rtl.intfRefs.free...');
      for (var id in this){
        if (this.hasOwnProperty(id)){
          //console.log('rtl.intfRefs.free: id='+id+' '+this[id].$name+' $o='+this[id].$o.$classname);
          this[id]._Release();
        }
      }
    }
  },

  createIntfRefs: function(){
    //console.log('rtl.createIntfRefs');
    return Object.create(rtl.intfRefs);
  },

  setIntfP: function(path,name,value,skipAddRef){
    var old = path[name];
    //console.log('rtl.setIntfP path='+path+' name='+name+' old="'+(old?old.$name:'null')+'" value="'+(value?value.$name:'null')+'"');
    if (old === value) return;
    if (old !== null){
      path[name]=null;
      old._Release();
    }
    if (value !== null){
      if (!skipAddRef) value._AddRef();
      path[name]=value;
    }
  },

  setIntfL: function(old,value,skipAddRef){
    //console.log('rtl.setIntfL old="'+(old?old.$name:'null')+'" value="'+(value?value.$name:'null')+'"');
    if (old !== value){
      if (value!==null){
        if (!skipAddRef) value._AddRef();
      }
      if (old!==null){
        old._Release();  // Release after AddRef, to avoid double Release if Release creates an exception
      }
    } else if (skipAddRef){
      if (old!==null){
        old._Release();  // value has an AddRef
      }
    }
    return value;
  },

  _AddRef: function(intf){
    //if (intf) console.log('rtl._AddRef intf="'+(intf?intf.$name:'null')+'"');
    if (intf) intf._AddRef();
    return intf;
  },

  _Release: function(intf){
    //if (intf) console.log('rtl._Release intf="'+(intf?intf.$name:'null')+'"');
    if (intf) intf._Release();
    return intf;
  },

  checkMethodCall: function(obj,type){
    if (rtl.isObject(obj) && rtl.is(obj,type)) return;
    rtl.raiseE("EInvalidCast");
  },

  oc: function(i){
    // overflow check integer
    if ((Math.floor(i)===i) && (i>=-0x1fffffffffffff) && (i<=0x1fffffffffffff)) return i;
    rtl.raiseE('EIntOverflow');
  },

  rc: function(i,minval,maxval){
    // range check integer
    if ((Math.floor(i)===i) && (i>=minval) && (i<=maxval)) return i;
    rtl.raiseE('ERangeError');
  },

  rcc: function(c,minval,maxval){
    // range check char
    if ((typeof(c)==='string') && (c.length===1)){
      var i = c.charCodeAt(0);
      if ((i>=minval) && (i<=maxval)) return c;
    }
    rtl.raiseE('ERangeError');
  },

  rcSetCharAt: function(s,index,c){
    // range check setCharAt
    if ((typeof(s)!=='string') || (index<0) || (index>=s.length)) rtl.raiseE('ERangeError');
    return rtl.setCharAt(s,index,c);
  },

  rcCharAt: function(s,index){
    // range check charAt
    if ((typeof(s)!=='string') || (index<0) || (index>=s.length)) rtl.raiseE('ERangeError');
    return s.charAt(index);
  },

  rcArrR: function(arr,index){
    // range check read array
    if (Array.isArray(arr) && (typeof(index)==='number') && (index>=0) && (index<arr.length)){
      if (arguments.length>2){
        // arr,index1,index2,...
        arr=arr[index];
        for (var i=2; i<arguments.length; i++) arr=rtl.rcArrR(arr,arguments[i]);
        return arr;
      }
      return arr[index];
    }
    rtl.raiseE('ERangeError');
  },

  rcArrW: function(arr,index,value){
    // range check write array
    // arr,index1,index2,...,value
    for (var i=3; i<arguments.length; i++){
      arr=rtl.rcArrR(arr,index);
      index=arguments[i-1];
      value=arguments[i];
    }
    if (Array.isArray(arr) && (typeof(index)==='number') && (index>=0) && (index<arr.length)){
      return arr[index]=value;
    }
    rtl.raiseE('ERangeError');
  },

  length: function(arr){
    return (arr == null) ? 0 : arr.length;
  },

  arrayRef: function(a){
    if (a!=null) rtl.hideProp(a,'$pas2jsrefcnt',1);
    return a;
  },

  arraySetLength: function(arr,defaultvalue,newlength){
    var stack = [];
    var s = 9999;
    for (var i=2; i<arguments.length; i++){
      var j = arguments[i];
      if (j==='s'){ s = i-2; }
      else {
        stack.push({ dim:j+0, a:null, i:0, src:null });
      }
    }
    var dimmax = stack.length-1;
    var depth = 0;
    var lastlen = 0;
    var item = null;
    var a = null;
    var src = arr;
    var srclen = 0, oldlen = 0;
    do{
      if (depth>0){
        item=stack[depth-1];
        src = (item.src && item.src.length>item.i)?item.src[item.i]:null;
      }
      if (!src){
        a = [];
        srclen = 0;
        oldlen = 0;
      } else if (src.$pas2jsrefcnt>0 || depth>=s){
        a = [];
        srclen = src.length;
        oldlen = srclen;
      } else {
        a = src;
        srclen = 0;
        oldlen = a.length;
      }
      lastlen = stack[depth].dim;
      a.length = lastlen;
      if (depth>0){
        item.a[item.i]=a;
        item.i++;
        if ((lastlen===0) && (item.i<item.a.length)) continue;
      }
      if (lastlen>0){
        if (depth<dimmax){
          item = stack[depth];
          item.a = a;
          item.i = 0;
          item.src = src;
          depth++;
          continue;
        } else {
          if (srclen>lastlen) srclen=lastlen;
          if (rtl.isArray(defaultvalue)){
            // array of dyn array
            for (var i=0; i<srclen; i++) a[i]=src[i];
            for (var i=oldlen; i<lastlen; i++) a[i]=[];
          } else if (rtl.isObject(defaultvalue)) {
            if (rtl.isTRecord(defaultvalue)){
              // array of record
              for (var i=0; i<srclen; i++) a[i]=defaultvalue.$clone(src[i]);
              for (var i=oldlen; i<lastlen; i++) a[i]=defaultvalue.$new();
            } else {
              // array of set
              for (var i=0; i<srclen; i++) a[i]=rtl.refSet(src[i]);
              for (var i=oldlen; i<lastlen; i++) a[i]={};
            }
          } else {
            for (var i=0; i<srclen; i++) a[i]=src[i];
            for (var i=oldlen; i<lastlen; i++) a[i]=defaultvalue;
          }
        }
      }
      // backtrack
      while ((depth>0) && (stack[depth-1].i>=stack[depth-1].dim)){
        depth--;
      };
      if (depth===0){
        if (dimmax===0) return a;
        return stack[0].a;
      }
    }while (true);
  },

  arrayEq: function(a,b){
    if (a===null) return b===null;
    if (b===null) return false;
    if (a.length!==b.length) return false;
    for (var i=0; i<a.length; i++) if (a[i]!==b[i]) return false;
    return true;
  },

  arrayClone: function(type,src,srcpos,endpos,dst,dstpos){
    // type: 0 for references, "refset" for calling refSet(), a function for new type()
    // src must not be null
    // This function does not range check.
    if(type === 'refSet') {
      for (; srcpos<endpos; srcpos++) dst[dstpos++] = rtl.refSet(src[srcpos]); // ref set
    } else if (rtl.isTRecord(type)){
      for (; srcpos<endpos; srcpos++) dst[dstpos++] = type.$clone(src[srcpos]); // clone record
    }  else {
      for (; srcpos<endpos; srcpos++) dst[dstpos++] = src[srcpos]; // reference
    };
  },

  arrayConcat: function(type){
    // type: see rtl.arrayClone
    var a = [];
    var l = 0;
    for (var i=1; i<arguments.length; i++){
      var src = arguments[i];
      if (src !== null) l+=src.length;
    };
    a.length = l;
    l=0;
    for (var i=1; i<arguments.length; i++){
      var src = arguments[i];
      if (src === null) continue;
      rtl.arrayClone(type,src,0,src.length,a,l);
      l+=src.length;
    };
    return a;
  },

  arrayConcatN: function(){
    var a = null;
    for (var i=1; i<arguments.length; i++){
      var src = arguments[i];
      if (src === null) continue;
      if (a===null){
        a=src; // Note: concat(a) does not clone
      } else {
        a=a.concat(src);
      }
    };
    return a;
  },

  arrayCopy: function(type, srcarray, index, count){
    // type: see rtl.arrayClone
    // if count is missing, use srcarray.length
    if (srcarray === null) return [];
    if (index < 0) index = 0;
    if (count === undefined) count=srcarray.length;
    var end = index+count;
    if (end>srcarray.length) end = srcarray.length;
    if (index>=end) return [];
    if (type===0){
      return srcarray.slice(index,end);
    } else {
      var a = [];
      a.length = end-index;
      rtl.arrayClone(type,srcarray,index,end,a,0);
      return a;
    }
  },

  setCharAt: function(s,index,c){
    return s.substr(0,index)+c+s.substr(index+1);
  },

  getResStr: function(mod,name){
    var rs = mod.$resourcestrings[name];
    return rs.current?rs.current:rs.org;
  },

  createSet: function(){
    var s = {};
    for (var i=0; i<arguments.length; i++){
      if (arguments[i]!=null){
        s[arguments[i]]=true;
      } else {
        var first=arguments[i+=1];
        var last=arguments[i+=1];
        for(var j=first; j<=last; j++) s[j]=true;
      }
    }
    return s;
  },

  cloneSet: function(s){
    var r = {};
    for (var key in s) r[key]=true;
    return r;
  },

  refSet: function(s){
    rtl.hideProp(s,'$shared',true);
    return s;
  },

  includeSet: function(s,enumvalue){
    if (s.$shared) s = rtl.cloneSet(s);
    s[enumvalue] = true;
    return s;
  },

  excludeSet: function(s,enumvalue){
    if (s.$shared) s = rtl.cloneSet(s);
    delete s[enumvalue];
    return s;
  },

  diffSet: function(s,t){
    var r = {};
    for (var key in s) if (!t[key]) r[key]=true;
    return r;
  },

  unionSet: function(s,t){
    var r = {};
    for (var key in s) r[key]=true;
    for (var key in t) r[key]=true;
    return r;
  },

  intersectSet: function(s,t){
    var r = {};
    for (var key in s) if (t[key]) r[key]=true;
    return r;
  },

  symDiffSet: function(s,t){
    var r = {};
    for (var key in s) if (!t[key]) r[key]=true;
    for (var key in t) if (!s[key]) r[key]=true;
    return r;
  },

  eqSet: function(s,t){
    for (var key in s) if (!t[key]) return false;
    for (var key in t) if (!s[key]) return false;
    return true;
  },

  neSet: function(s,t){
    return !rtl.eqSet(s,t);
  },

  leSet: function(s,t){
    for (var key in s) if (!t[key]) return false;
    return true;
  },

  geSet: function(s,t){
    for (var key in t) if (!s[key]) return false;
    return true;
  },

  strSetLength: function(s,newlen){
    var oldlen = s.length;
    if (oldlen > newlen){
      return s.substring(0,newlen);
    } else if (s.repeat){
      // Note: repeat needs ECMAScript6!
      return s+' '.repeat(newlen-oldlen);
    } else {
       while (oldlen<newlen){
         s+=' ';
         oldlen++;
       };
       return s;
    }
  },

  spaceLeft: function(s,width){
    var l=s.length;
    if (l>=width) return s;
    if (s.repeat){
      // Note: repeat needs ECMAScript6!
      return ' '.repeat(width-l) + s;
    } else {
      while (l<width){
        s=' '+s;
        l++;
      };
      return s;
    };
  },

  floatToStr: function(d,w,p){
    // input 1-3 arguments: double, width, precision
    if (arguments.length>2){
      return rtl.spaceLeft(d.toFixed(p),w);
    } else {
	  // exponent width
	  var pad = "";
	  var ad = Math.abs(d);
	  if (ad<1.0e+10) {
		pad='00';
	  } else if (ad<1.0e+100) {
		pad='0';
      }  	
	  if (arguments.length<2) {
	    w=9;		
      } else if (w<9) {
		w=9;
      }		  
      var p = w-8;
      var s=(d>0 ? " " : "" ) + d.toExponential(p);
      s=s.replace(/e(.)/,'E$1'+pad);
      return rtl.spaceLeft(s,w);
    }
  },

  valEnum: function(s, enumType, setCodeFn){
    s = s.toLowerCase();
    for (var key in enumType){
      if((typeof(key)==='string') && (key.toLowerCase()===s)){
        setCodeFn(0);
        return enumType[key];
      }
    }
    setCodeFn(1);
    return 0;
  },

  lw: function(l){
    // fix longword bitwise operation
    return l<0?l+0x100000000:l;
  },

  and: function(a,b){
    var hi = 0x80000000;
    var low = 0x7fffffff;
    var h = (a / hi) & (b / hi);
    var l = (a & low) & (b & low);
    return h*hi + l;
  },

  or: function(a,b){
    var hi = 0x80000000;
    var low = 0x7fffffff;
    var h = (a / hi) | (b / hi);
    var l = (a & low) | (b & low);
    return h*hi + l;
  },

  xor: function(a,b){
    var hi = 0x80000000;
    var low = 0x7fffffff;
    var h = (a / hi) ^ (b / hi);
    var l = (a & low) ^ (b & low);
    return h*hi + l;
  },

  shr: function(a,b){
    if (a<0) a += rtl.hiInt;
    if (a<0x80000000) return a >> b;
    if (b<=0) return a;
    if (b>54) return 0;
    return Math.floor(a / Math.pow(2,b));
  },

  shl: function(a,b){
    if (a<0) a += rtl.hiInt;
    if (b<=0) return a;
    if (b>54) return 0;
    var r = a * Math.pow(2,b);
    if (r <= rtl.hiInt) return r;
    return r % rtl.hiInt;
  },

  initRTTI: function(){
    if (rtl.debug_rtti) rtl.debug('initRTTI');

    // base types
    rtl.tTypeInfo = { name: "tTypeInfo" };
    function newBaseTI(name,kind,ancestor){
      if (!ancestor) ancestor = rtl.tTypeInfo;
      if (rtl.debug_rtti) rtl.debug('initRTTI.newBaseTI "'+name+'" '+kind+' ("'+ancestor.name+'")');
      var t = Object.create(ancestor);
      t.name = name;
      t.kind = kind;
      rtl[name] = t;
      return t;
    };
    function newBaseInt(name,minvalue,maxvalue,ordtype){
      var t = newBaseTI(name,1 /* tkInteger */,rtl.tTypeInfoInteger);
      t.minvalue = minvalue;
      t.maxvalue = maxvalue;
      t.ordtype = ordtype;
      return t;
    };
    newBaseTI("tTypeInfoInteger",1 /* tkInteger */);
    newBaseInt("shortint",-0x80,0x7f,0);
    newBaseInt("byte",0,0xff,1);
    newBaseInt("smallint",-0x8000,0x7fff,2);
    newBaseInt("word",0,0xffff,3);
    newBaseInt("longint",-0x80000000,0x7fffffff,4);
    newBaseInt("longword",0,0xffffffff,5);
    newBaseInt("nativeint",-0x10000000000000,0xfffffffffffff,6);
    newBaseInt("nativeuint",0,0xfffffffffffff,7);
    newBaseTI("char",2 /* tkChar */);
    newBaseTI("string",3 /* tkString */);
    newBaseTI("tTypeInfoEnum",4 /* tkEnumeration */,rtl.tTypeInfoInteger);
    newBaseTI("tTypeInfoSet",5 /* tkSet */);
    newBaseTI("double",6 /* tkDouble */);
    newBaseTI("boolean",7 /* tkBool */);
    newBaseTI("tTypeInfoProcVar",8 /* tkProcVar */);
    newBaseTI("tTypeInfoMethodVar",9 /* tkMethod */,rtl.tTypeInfoProcVar);
    newBaseTI("tTypeInfoArray",10 /* tkArray */);
    newBaseTI("tTypeInfoDynArray",11 /* tkDynArray */);
    newBaseTI("tTypeInfoPointer",15 /* tkPointer */);
    var t = newBaseTI("pointer",15 /* tkPointer */,rtl.tTypeInfoPointer);
    t.reftype = null;
    newBaseTI("jsvalue",16 /* tkJSValue */);
    newBaseTI("tTypeInfoRefToProcVar",17 /* tkRefToProcVar */,rtl.tTypeInfoProcVar);

    // member kinds
    rtl.tTypeMember = {};
    function newMember(name,kind){
      var m = Object.create(rtl.tTypeMember);
      m.name = name;
      m.kind = kind;
      rtl[name] = m;
    };
    newMember("tTypeMemberField",1); // tmkField
    newMember("tTypeMemberMethod",2); // tmkMethod
    newMember("tTypeMemberProperty",3); // tmkProperty

    // base object for storing members: a simple object
    rtl.tTypeMembers = {};

    // tTypeInfoStruct - base object for tTypeInfoClass, tTypeInfoRecord, tTypeInfoInterface
    var tis = newBaseTI("tTypeInfoStruct",0);
    tis.$addMember = function(name,ancestor,options){
      if (rtl.debug_rtti){
        if (!rtl.hasString(name) || (name.charAt()==='$')) throw 'invalid member "'+name+'", this="'+this.name+'"';
        if (!rtl.is(ancestor,rtl.tTypeMember)) throw 'invalid ancestor "'+ancestor+':'+ancestor.name+'", "'+this.name+'.'+name+'"';
        if ((options!=undefined) && (typeof(options)!='object')) throw 'invalid options "'+options+'", "'+this.name+'.'+name+'"';
      };
      var t = Object.create(ancestor);
      t.name = name;
      this.members[name] = t;
      this.names.push(name);
      if (rtl.isObject(options)){
        for (var key in options) if (options.hasOwnProperty(key)) t[key] = options[key];
      };
      return t;
    };
    tis.addField = function(name,type,options){
      var t = this.$addMember(name,rtl.tTypeMemberField,options);
      if (rtl.debug_rtti){
        if (!rtl.is(type,rtl.tTypeInfo)) throw 'invalid type "'+type+'", "'+this.name+'.'+name+'"';
      };
      t.typeinfo = type;
      this.fields.push(name);
      return t;
    };
    tis.addFields = function(){
      var i=0;
      while(i<arguments.length){
        var name = arguments[i++];
        var type = arguments[i++];
        if ((i<arguments.length) && (typeof(arguments[i])==='object')){
          this.addField(name,type,arguments[i++]);
        } else {
          this.addField(name,type);
        };
      };
    };
    tis.addMethod = function(name,methodkind,params,result,options){
      var t = this.$addMember(name,rtl.tTypeMemberMethod,options);
      t.methodkind = methodkind;
      t.procsig = rtl.newTIProcSig(params);
      t.procsig.resulttype = result?result:null;
      this.methods.push(name);
      return t;
    };
    tis.addProperty = function(name,flags,result,getter,setter,options){
      var t = this.$addMember(name,rtl.tTypeMemberProperty,options);
      t.flags = flags;
      t.typeinfo = result;
      t.getter = getter;
      t.setter = setter;
      // Note: in options: params, stored, defaultvalue
      if (rtl.isArray(t.params)) t.params = rtl.newTIParams(t.params);
      this.properties.push(name);
      if (!rtl.isString(t.stored)) t.stored = "";
      return t;
    };
    tis.getField = function(index){
      return this.members[this.fields[index]];
    };
    tis.getMethod = function(index){
      return this.members[this.methods[index]];
    };
    tis.getProperty = function(index){
      return this.members[this.properties[index]];
    };

    newBaseTI("tTypeInfoRecord",12 /* tkRecord */,rtl.tTypeInfoStruct);
    newBaseTI("tTypeInfoClass",13 /* tkClass */,rtl.tTypeInfoStruct);
    newBaseTI("tTypeInfoClassRef",14 /* tkClassRef */);
    newBaseTI("tTypeInfoInterface",18 /* tkInterface */,rtl.tTypeInfoStruct);
    newBaseTI("tTypeInfoHelper",19 /* tkHelper */,rtl.tTypeInfoStruct);
    newBaseTI("tTypeInfoExtClass",20 /* tkExtClass */,rtl.tTypeInfoClass);
  },

  tSectionRTTI: {
    $module: null,
    $inherited: function(name,ancestor,o){
      if (rtl.debug_rtti){
        rtl.debug('tSectionRTTI.newTI "'+(this.$module?this.$module.$name:"(no module)")
          +'"."'+name+'" ('+ancestor.name+') '+(o?'init':'forward'));
      };
      var t = this[name];
      if (t){
        if (!t.$forward) throw 'duplicate type "'+name+'"';
        if (!ancestor.isPrototypeOf(t)) throw 'typeinfo ancestor mismatch "'+name+'" ancestor="'+ancestor.name+'" t.name="'+t.name+'"';
      } else {
        t = Object.create(ancestor);
        t.name = name;
        t.$module = this.$module;
        this[name] = t;
      }
      if (o){
        delete t.$forward;
        for (var key in o) if (o.hasOwnProperty(key)) t[key]=o[key];
      } else {
        t.$forward = true;
      }
      return t;
    },
    $Scope: function(name,ancestor,o){
      var t=this.$inherited(name,ancestor,o);
      t.members = {};
      t.names = [];
      t.fields = [];
      t.methods = [];
      t.properties = [];
      return t;
    },
    $TI: function(name,kind,o){ var t=this.$inherited(name,rtl.tTypeInfo,o); t.kind = kind; return t; },
    $Int: function(name,o){ return this.$inherited(name,rtl.tTypeInfoInteger,o); },
    $Enum: function(name,o){ return this.$inherited(name,rtl.tTypeInfoEnum,o); },
    $Set: function(name,o){ return this.$inherited(name,rtl.tTypeInfoSet,o); },
    $StaticArray: function(name,o){ return this.$inherited(name,rtl.tTypeInfoArray,o); },
    $DynArray: function(name,o){ return this.$inherited(name,rtl.tTypeInfoDynArray,o); },
    $ProcVar: function(name,o){ return this.$inherited(name,rtl.tTypeInfoProcVar,o); },
    $RefToProcVar: function(name,o){ return this.$inherited(name,rtl.tTypeInfoRefToProcVar,o); },
    $MethodVar: function(name,o){ return this.$inherited(name,rtl.tTypeInfoMethodVar,o); },
    $Record: function(name,o){ return this.$Scope(name,rtl.tTypeInfoRecord,o); },
    $Class: function(name,o){ return this.$Scope(name,rtl.tTypeInfoClass,o); },
    $ClassRef: function(name,o){ return this.$inherited(name,rtl.tTypeInfoClassRef,o); },
    $Pointer: function(name,o){ return this.$inherited(name,rtl.tTypeInfoPointer,o); },
    $Interface: function(name,o){ return this.$Scope(name,rtl.tTypeInfoInterface,o); },
    $Helper: function(name,o){ return this.$Scope(name,rtl.tTypeInfoHelper,o); },
    $ExtClass: function(name,o){ return this.$Scope(name,rtl.tTypeInfoExtClass,o); }
  },

  newTIParam: function(param){
    // param is an array, 0=name, 1=type, 2=optional flags
    var t = {
      name: param[0],
      typeinfo: param[1],
      flags: (rtl.isNumber(param[2]) ? param[2] : 0)
    };
    return t;
  },

  newTIParams: function(list){
    // list: optional array of [paramname,typeinfo,optional flags]
    var params = [];
    if (rtl.isArray(list)){
      for (var i=0; i<list.length; i++) params.push(rtl.newTIParam(list[i]));
    };
    return params;
  },

  newTIProcSig: function(params,result,flags){
    var s = {
      params: rtl.newTIParams(params),
      resulttype: result,
      flags: flags
    };
    return s;
  },

  addResource: function(aRes){
    rtl.$res[aRes.name]=aRes;
  },

  getResource: function(aName){
    var res = rtl.$res[aName];
    if (res !== undefined) {
      return res;
    } else {
      return null;
    }
  },

  getResourceList: function(){
    return Object.keys(rtl.$res);
  }
}

rtl.module("System",[],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  rtl.createClass($mod,"TObject",null,function () {
    this.$init = function () {
    };
    this.$final = function () {
    };
    this.AfterConstruction = function () {
    };
    this.BeforeDestruction = function () {
    };
  });
  this.Random = function (Range) {
    return Math.floor(Math.random()*Range);
  };
  this.Trunc = function (A) {
    if (!Math.trunc) {
      Math.trunc = function(v) {
        v = +v;
        if (!isFinite(v)) return v;
        return (v - v % 1) || (v < 0 ? -0 : v === 0 ? v : 0);
      };
    }
    $mod.Trunc = Math.trunc;
    return Math.trunc(A);
  };
  this.Copy = function (S, Index, Size) {
    if (Index<1) Index = 1;
    return (Size>0) ? S.substring(Index-1,Index+Size-1) : "";
  };
  this.Write = function () {
    var i = 0;
    for (var $l = 0, $end = arguments.length - 1; $l <= $end; $l++) {
      i = $l;
      if ($impl.WriteCallBack != null) {
        $impl.WriteCallBack(arguments[i],false)}
       else $impl.WriteBuf = $impl.WriteBuf + ("" + arguments[i]);
    };
  };
  this.SetWriteCallBack = function (H) {
    var Result = null;
    Result = $impl.WriteCallBack;
    $impl.WriteCallBack = H;
    return Result;
  };
  $mod.$init = function () {
    rtl.exitcode = 0;
  };
},null,function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  $impl.WriteBuf = "";
  $impl.WriteCallBack = null;
});
rtl.module("JS",["System"],function () {
  "use strict";
  var $mod = this;
});
rtl.module("weborworker",["System","JS"],function () {
  "use strict";
  var $mod = this;
});
rtl.module("Web",["System","JS","weborworker"],function () {
  "use strict";
  var $mod = this;
});
rtl.module("SysUtils",["System","JS"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  rtl.createClass($mod,"Exception",pas.System.TObject,function () {
  });
  rtl.createClass($mod,"EExternal",$mod.Exception,function () {
  });
  rtl.createClass($mod,"EInvalidCast",$mod.Exception,function () {
  });
  rtl.createClass($mod,"EIntError",$mod.EExternal,function () {
  });
  rtl.createClass($mod,"ERangeError",$mod.EIntError,function () {
  });
  rtl.createClass($mod,"EAbstractError",$mod.Exception,function () {
  });
  this.IntToStr = function (Value) {
    var Result = "";
    Result = "" + Value;
    return Result;
  };
  this.ShortMonthNames = rtl.arraySetLength(null,"",12);
  this.LongMonthNames = rtl.arraySetLength(null,"",12);
  this.ShortDayNames = rtl.arraySetLength(null,"",7);
  this.LongDayNames = rtl.arraySetLength(null,"",7);
  $mod.$init = function () {
    $impl.DoClassRef($mod.EInvalidCast);
    $impl.DoClassRef($mod.EAbstractError);
    $impl.DoClassRef($mod.ERangeError);
    $mod.ShortMonthNames = $impl.DefaultShortMonthNames.slice(0);
    $mod.LongMonthNames = $impl.DefaultLongMonthNames.slice(0);
    $mod.ShortDayNames = $impl.DefaultShortDayNames.slice(0);
    $mod.LongDayNames = $impl.DefaultLongDayNames.slice(0);
  };
},null,function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  $impl.DefaultShortMonthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  $impl.DefaultLongMonthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  $impl.DefaultShortDayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  $impl.DefaultLongDayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  $impl.DoClassRef = function (C) {
    if (C === null) ;
  };
});
rtl.module("crt",["System","JS"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  this.Blue = 1;
  this.Brown = 6;
  this.LightGray = 7;
  this.LightRed = 12;
  this.KeyPressed = function () {
    var Result = false;
    $impl.Install();
    Result = rtl.length($impl.Queue) > 0;
    return Result;
  };
  this.ReadKey = function () {
    var Result = "";
    var i = 0;
    $impl.Install();
    if (rtl.length($impl.Queue) === 0) {
      Result = "\x00";
      return Result;
    };
    Result = $impl.Queue[0];
    for (var $l = 0, $end = rtl.length($impl.Queue) - 2; $l <= $end; $l++) {
      i = $l;
      $impl.Queue[i] = $impl.Queue[i + 1];
    };
    $impl.Queue = rtl.arraySetLength($impl.Queue,"",rtl.length($impl.Queue) - 1);
    return Result;
  };
  this.Delay = function (ms) {
    var Result = null;
    var wait = 0;
    $impl.Install();
    wait = Math.round(ms * $mod.DelayScale);
    if (wait < $mod.MinDelayMs) wait = $mod.MinDelayMs;
    Result = new Promise(function (resolve, reject) {
      window.setTimeout(function () {
        resolve(0);
      },wait);
    });
    return Result;
  };
  this.FrameDelay = function (ms) {
    var Result = null;
    $impl.Install();
    Result = new Promise(function (resolve, reject) {
      window.setTimeout(function () {
        resolve(0);
      },ms);
    });
    return Result;
  };
  this.Sound = function (hz) {
    try {
      if (!window.__retroAudio) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const gain = ctx.createGain();
        gain.gain.value = 0.04;
        gain.connect(ctx.destination);
        window.__retroAudio = { ctx, gain, osc: null };
      }
      const a = window.__retroAudio;
      if (a.osc) { a.osc.stop(); a.osc = null; }
      a.ctx.resume && a.ctx.resume();
      const osc = a.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = hz;
      osc.connect(a.gain);
      osc.start();
      a.osc = osc;
    } catch (e) { /* no audio — fine */ };
  };
  this.NoSound = function () {
    try {
      const a = window.__retroAudio;
      if (a && a.osc) { a.osc.stop(); a.osc = null; }
    } catch (e) {};
  };
  this.Yield = function () {
    var Result = null;
    Result = new Promise(function (resolve, reject) {
      if (!window.__retroYield) {
        const ch = new MessageChannel();
        const q = [];
        ch.port1.onmessage = () => { const f = q.shift(); if (f) f(0); };
        window.__retroYield = (cb) => { q.push(cb); ch.port2.postMessage(0); };
      }
      window.__retroYield(resolve);
    });
    return Result;
  };
  this.TextBackground = function (c) {
    $impl.TextEnsure();
    $impl.CurBg = c & 15;
  };
  this.TextColor = function (c) {
    $impl.TextEnsure();
    $impl.CurFg = c & 15;
  };
  this.TextShutdown = function () {
    if (!$impl.TextActive) return;
    $impl.TextActive = false;
  };
  this.ClrScr = function () {
    var i = 0;
    if (pas.graph.GraphActive()) {
      pas.graph.ClearDevice();
      return;
    };
    $impl.TextEnsure();
    for (i = 0; i <= 1999; i++) {
      $impl.CellCh[i] = " ";
      $impl.CellFg[i] = $impl.CurFg;
      $impl.CellBg[i] = $impl.CurBg;
    };
    $impl.CurX = 1;
    $impl.CurY = 1;
  };
  this.Randomize = function () {
  };
  this.Readln = function () {
  };
  this.DelayScale = 0.032;
  this.MinDelayMs = 160;
  $mod.$init = function () {
    if ($mod.KeyPressed()) $mod.ReadKey();
    pas.System.SetWriteCallBack(function (S, NewLine) {
      if (pas.graph.GraphActive()) return;
      $impl.TextEnsure();
      $impl.HandleWrite(S,NewLine);
    });
  };
},["Web","graph"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  $impl.Queue = [];
  $impl.Installed = false;
  $impl.PromptActive = false;
  $impl.KeyBufferMax = 16;
  $impl.Push = function (c) {
    if (rtl.length($impl.Queue) >= 16) return;
    $impl.Queue = rtl.arraySetLength($impl.Queue,"",rtl.length($impl.Queue) + 1);
    $impl.Queue[rtl.length($impl.Queue) - 1] = c;
  };
  $impl.OnKeyDown = function (aEvent) {
    var Result = false;
    if ($impl.PromptActive) {
      Result = true;
      return Result;
    };
    var $tmp = aEvent.key;
    if ($tmp === "ArrowLeft") {
      $impl.Push("\x00");
      $impl.Push("K");
    } else if ($tmp === "ArrowRight") {
      $impl.Push("\x00");
      $impl.Push("M");
    } else if ($tmp === "ArrowUp") {
      $impl.Push("\x00");
      $impl.Push("H");
    } else if ($tmp === "ArrowDown") {
      $impl.Push("\x00");
      $impl.Push("P");
    } else if ($tmp === "Escape") {
      $impl.Push("\x1B")}
     else if ($tmp === "Enter") {
      $impl.Push("\r")}
     else if ($tmp === " ") {
      $impl.Push(" ")}
     else {
      if (aEvent.key.length === 1) $impl.Push(aEvent.key.charAt(0));
    };
    if (pas.System.Copy(aEvent.key,1,5) === "Arrow") aEvent.preventDefault();
    Result = true;
    return Result;
  };
  $impl.Install = function () {
    if ($impl.Installed) return;
    $impl.Installed = true;
    document.addEventListener("keydown",$impl.OnKeyDown);
  };
  $impl.Cols = 80;
  $impl.Rows = 25;
  $impl.CellW = 8;
  $impl.CellH = 16;
  $impl.Css = ["#000000","#0000a8","#00a800","#00a8a8","#a80000","#a800a8","#a85400","#a8a8a8","#545454","#5454ff","#54ff54","#54ffff","#ff5454","#ff54ff","#ffff54","#ffffff"];
  $impl.TextActive = false;
  $impl.TextCanvas = null;
  $impl.TextCtx = null;
  $impl.CellCh = [];
  $impl.CellFg = [];
  $impl.CellBg = [];
  $impl.CurX = 1;
  $impl.CurY = 1;
  $impl.CurFg = 7;
  $impl.CurBg = 0;
  $impl.CtrlGlyph = function (code) {
    var Result = "";
    var $tmp = code;
    if ($tmp === 16) {
      Result = "►"}
     else if ($tmp === 17) {
      Result = "◄"}
     else if ($tmp === 24) {
      Result = "↑"}
     else if ($tmp === 25) {
      Result = "↓"}
     else if ($tmp === 30) {
      Result = "▲"}
     else if ($tmp === 31) {
      Result = "▼"}
     else {
      Result = " ";
    };
    return Result;
  };
  $impl.HighGlyph = function (code) {
    var Result = "";
    var $tmp = code;
    if ($tmp === 179) {
      Result = "│"}
     else if ($tmp === 191) {
      Result = "┐"}
     else if ($tmp === 192) {
      Result = "└"}
     else if ($tmp === 196) {
      Result = "─"}
     else if ($tmp === 217) {
      Result = "┘"}
     else if ($tmp === 218) {
      Result = "┌"}
     else {
      Result = String.fromCharCode(code);
    };
    return Result;
  };
  $impl.TextEnsure = function () {
    var i = 0;
    if ($impl.TextActive) return;
    $impl.TextActive = true;
    $impl.TextCanvas = document.getElementById("screen");
    if ($impl.TextCanvas === null) return;
    $impl.TextCanvas.width = 80 * 8;
    $impl.TextCanvas.height = 25 * 16;
    $impl.TextCtx = $impl.TextCanvas.getContext("2d");
    $impl.CellCh = rtl.arraySetLength($impl.CellCh,"",80 * 25);
    $impl.CellFg = rtl.arraySetLength($impl.CellFg,0,80 * 25);
    $impl.CellBg = rtl.arraySetLength($impl.CellBg,0,80 * 25);
    for (i = 0; i <= 1999; i++) {
      $impl.CellCh[i] = " ";
      $impl.CellFg[i] = 7;
      $impl.CellBg[i] = 0;
    };
    window.requestAnimationFrame($impl.TextPaint);
  };
  $impl.HandleWrite = function (S, NewLine) {
    var txt = "";
    var k = 0;
    var code = 0;
    var g = "";
    txt = "" + S;
    for (var $l = 1, $end = txt.length; $l <= $end; $l++) {
      k = $l;
      code = txt.charCodeAt(k - 1);
      if (code === 13) {
        $impl.CurX = 1;
        continue;
      };
      if (code === 10) {
        $impl.CurX = 1;
        $impl.CurY += 1;
        continue;
      };
      if (code < 32) {
        g = $impl.CtrlGlyph(code)}
       else if (code > 126) {
        g = $impl.HighGlyph(code)}
       else g = txt.charAt(k - 1);
      if (($impl.CurX >= 1) && ($impl.CurX <= 80) && ($impl.CurY >= 1) && ($impl.CurY <= 25)) {
        $impl.CellCh[(($impl.CurY - 1) * 80) + ($impl.CurX - 1)] = g;
        $impl.CellFg[(($impl.CurY - 1) * 80) + ($impl.CurX - 1)] = $impl.CurFg;
        $impl.CellBg[(($impl.CurY - 1) * 80) + ($impl.CurX - 1)] = $impl.CurBg;
      };
      $impl.CurX += 1;
      if ($impl.CurX > 80) {
        $impl.CurX = 1;
        $impl.CurY += 1;
      };
    };
    if (NewLine) {
      $impl.CurX = 1;
      $impl.CurY += 1;
    };
    while ($impl.CurY > 25) {
      for (k = 0; k <= 1919; k++) {
        $impl.CellCh[k] = $impl.CellCh[k + 80];
        $impl.CellFg[k] = $impl.CellFg[k + 80];
        $impl.CellBg[k] = $impl.CellBg[k + 80];
      };
      for (k = 1920; k <= 1999; k++) {
        $impl.CellCh[k] = " ";
        $impl.CellFg[k] = 7;
        $impl.CellBg[k] = $impl.CurBg;
      };
      $impl.CurY -= 1;
    };
  };
  $impl.TextPaint = function (aTime) {
    var x = 0;
    var y = 0;
    var i = 0;
    if (!$impl.TextActive) return;
    if ($impl.TextCtx !== null) {
      $impl.TextCtx.font = '16px "IBM VGA", ui-monospace, Menlo, monospace';
      $impl.TextCtx.textBaseline = "top";
      for (y = 0; y <= 24; y++) for (x = 0; x <= 79; x++) {
        i = (y * 80) + x;
        $impl.TextCtx["fillStyle"] = $impl.Css[$impl.CellBg[i] & 15];
        $impl.TextCtx.fillRect(x * 8,y * 16,8,16);
        if ($impl.CellCh[i] !== " ") {
          $impl.TextCtx["fillStyle"] = $impl.Css[$impl.CellFg[i] & 15];
          $impl.TextCtx.fillText($impl.CellCh[i],x * 8,y * 16);
        };
      };
    };
    window.requestAnimationFrame($impl.TextPaint);
  };
});
rtl.module("graph",["System"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  this.Detect = 0;
  this.GrOk = 0;
  this.grNotDetected = -2;
  this.HorizDir = 0;
  this.ScreenW = 640;
  this.ScreenH = 480;
  this.InitGraph = function (gd, gm, path) {
    pas.crt.TextShutdown();
    $impl.Canvas = document.getElementById("screen");
    if ($impl.Canvas === null) {
      $impl.LastResult = -2;
      return;
    };
    $impl.Canvas.width = 640;
    $impl.Canvas.height = 480;
    $impl.Ctx = $impl.Canvas.getContext("2d");
    $impl.Img = $impl.Ctx.createImageData(640,480);
    $impl.FB = rtl.arraySetLength($impl.FB,0,640 * 480);
    $mod.ClearDevice();
    $impl.LastResult = 0;
    gm.set(0);
    window.requestAnimationFrame($impl.Frame);
  };
  this.CloseGraph = function () {
    $impl.Ctx = null;
    $impl.Canvas = null;
    $impl.Img = null;
    $impl.FB = rtl.arraySetLength($impl.FB,0,0);
  };
  this.GraphActive = function () {
    var Result = false;
    Result = $impl.Ctx !== null;
    return Result;
  };
  this.GraphResult = function () {
    var Result = 0;
    Result = $impl.LastResult;
    return Result;
  };
  this.GraphErrorMsg = function (code) {
    var Result = "";
    if (code === 0) {
      Result = ""}
     else Result = "Graphics error " + pas.SysUtils.IntToStr(code);
    return Result;
  };
  this.SetColor = function (c) {
    $impl.CurColor = c & 15;
  };
  this.SetFillStyle = function (pattern, c) {
    $impl.FillColor = c & 15;
  };
  this.PutPixel = function (x, y, c) {
    if ((x < 0) || (y < 0) || (x >= 640) || (y >= 480)) return;
    $impl.FB[(y * 640) + x] = c & 15;
  };
  this.GetPixel = function (x, y) {
    var Result = 0;
    if ((x < 0) || (y < 0) || (x >= 640) || (y >= 480)) {
      Result = 0}
     else Result = $impl.FB[(y * 640) + x];
    return Result;
  };
  this.Line = function (x1, y1, x2, y2) {
    var dx = 0;
    var dy = 0;
    var sx = 0;
    var sy = 0;
    var err = 0;
    var e2 = 0;
    dx = Math.abs(x2 - x1);
    dy = -Math.abs(y2 - y1);
    if (x1 < x2) {
      sx = 1}
     else sx = -1;
    if (y1 < y2) {
      sy = 1}
     else sy = -1;
    err = dx + dy;
    while (true) {
      $mod.PutPixel(x1,y1,$impl.CurColor);
      if ((x1 === x2) && (y1 === y2)) break;
      e2 = 2 * err;
      if (e2 >= dy) {
        err = err + dy;
        x1 = x1 + sx;
      };
      if (e2 <= dx) {
        err = err + dx;
        y1 = y1 + sy;
      };
    };
  };
  this.Rectangle = function (x1, y1, x2, y2) {
    $mod.Line(x1,y1,x2,y1);
    $mod.Line(x2,y1,x2,y2);
    $mod.Line(x2,y2,x1,y2);
    $mod.Line(x1,y2,x1,y1);
  };
  this.Bar = function (x1, y1, x2, y2) {
    var x = 0;
    var y = 0;
    var t = 0;
    if (x1 > x2) {
      t = x1;
      x1 = x2;
      x2 = t;
    };
    if (y1 > y2) {
      t = y1;
      y1 = y2;
      y2 = t;
    };
    for (var $l = y1, $end = y2; $l <= $end; $l++) {
      y = $l;
      for (var $l1 = x1, $end1 = x2; $l1 <= $end1; $l1++) {
        x = $l1;
        $mod.PutPixel(x,y,$impl.FillColor);
      };
    };
  };
  this.Circle = function (x, y, r) {
    var cx = 0;
    var cy = 0;
    var err = 0;
    cx = r;
    cy = 0;
    err = 1 - cx;
    while (cx >= cy) {
      $mod.PutPixel(x + cx,y + cy,$impl.CurColor);
      $mod.PutPixel(x + cy,y + cx,$impl.CurColor);
      $mod.PutPixel(x - cy,y + cx,$impl.CurColor);
      $mod.PutPixel(x - cx,y + cy,$impl.CurColor);
      $mod.PutPixel(x - cx,y - cy,$impl.CurColor);
      $mod.PutPixel(x - cy,y - cx,$impl.CurColor);
      $mod.PutPixel(x + cy,y - cx,$impl.CurColor);
      $mod.PutPixel(x + cx,y - cy,$impl.CurColor);
      cy += 1;
      if (err < 0) {
        err = err + (2 * cy) + 1}
       else {
        cx -= 1;
        err = err + (2 * (cy - cx)) + 1;
      };
    };
  };
  this.Arc = function (x, y, stAngle, endAngle, r) {
    var a = 0;
    var endA = 0;
    var rad = 0.0;
    endA = endAngle;
    if (endA < stAngle) endA = endA + 360;
    a = stAngle;
    while (a <= endA) {
      rad = (a * 3.14159265358979) / 180.0;
      $mod.PutPixel(x + Math.round(r * Math.cos(rad)),y - Math.round(r * Math.sin(rad)),$impl.CurColor);
      a = a + 1;
    };
  };
  this.FloodFill = function (x, y, border) {
    var stack = [];
    var sp = 0;
    var p = 0;
    var px = 0;
    var py = 0;
    var b = 0;
    var f = 0;
    function Push(idx) {
      if (sp >= rtl.length(stack)) stack = rtl.arraySetLength(stack,0,rtl.length(stack) * 2);
      stack[sp] = idx;
      sp += 1;
    };
    b = border & 15;
    f = $impl.FillColor;
    if ((x < 0) || (y < 0) || (x >= 640) || (y >= 480)) return;
    if ($impl.FB[(y * 640) + x] === b) return;
    stack = rtl.arraySetLength(stack,0,4096);
    sp = 0;
    Push((y * 640) + x);
    while (sp > 0) {
      sp -= 1;
      p = stack[sp];
      if ($impl.FB[p] === b) continue;
      if ($impl.FB[p] === f) continue;
      $impl.FB[p] = f;
      px = p % 640;
      py = Math.floor(p / 640);
      if (px > 0) Push(p - 1);
      if (px < (640 - 1)) Push(p + 1);
      if (py > 0) Push(p - 640);
      if (py < (480 - 1)) Push(p + 640);
    };
  };
  this.ClearDevice = function () {
    var i = 0;
    if (rtl.length($impl.FB) === 0) return;
    for (i = 0; i <= 307199; i++) $impl.FB[i] = 0;
  };
  this.SetTextStyle = function (font, direction, charsize) {
    if (charsize < 1) charsize = 1;
    $impl.TextPxH = (6 * charsize) + 8;
  };
  this.OutTextXY = function (x, y, s) {
    var px = 0;
    px = $impl.TextPxH;
    var scr = document.createElement('canvas');
    var w = Math.min(1024, Math.max(8, Math.ceil(s.length * px)));
    scr.width = w; scr.height = px + 8;
    var c2 = scr.getContext('2d', { willReadFrequently: true });
    c2.font = px + "px 'IBM VGA', monospace";
    c2.textBaseline = 'top';
    c2.fillStyle = '#fff';
    c2.fillText(s, 0, 0);
    var d = c2.getImageData(0, 0, scr.width, scr.height).data;
    for (var j = 0; j < scr.height; j++) {
      for (var i = 0; i < scr.width; i++) {
        if (d[(j * scr.width + i) * 4 + 3] > 128) {
          pas.graph.PutPixel(x + i, y + j, $impl.CurColor);
        }
      }
    };
  };
},["JS","Web","weborworker","SysUtils","crt"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  $impl.FB = [];
  $impl.CurColor = 15;
  $impl.FillColor = 15;
  $impl.LastResult = 0;
  $impl.Canvas = null;
  $impl.Ctx = null;
  $impl.Img = null;
  $impl.PalR = [0,0,0,0,168,168,168,168,84,84,84,84,255,255,255,255];
  $impl.PalG = [0,0,168,168,0,0,84,168,84,84,255,255,84,84,255,255];
  $impl.PalB = [0,168,0,168,0,168,0,168,84,255,84,255,84,255,84,255];
  $impl.Present = function () {
    var i = 0;
    var n = 0;
    var d = null;
    var c = 0;
    if ($impl.Ctx === null) return;
    d = $impl.Img.data;
    n = 640 * 480;
    for (var $l = 0, $end = n - 1; $l <= $end; $l++) {
      i = $l;
      c = $impl.FB[i];
      d[i * 4] = $impl.PalR[c];
      d[(i * 4) + 1] = $impl.PalG[c];
      d[(i * 4) + 2] = $impl.PalB[c];
      d[(i * 4) + 3] = 255;
    };
    $impl.Ctx.putImageData($impl.Img,0,0);
  };
  $impl.Frame = function (aTime) {
    $impl.Present();
    window.requestAnimationFrame($impl.Frame);
  };
  $impl.TextPxH = 16;
});
rtl.module("jarik",["System"],function () {
  "use strict";
  var $mod = this;
  this.InKey = function () {
    var Result = "";
    if (pas.crt.KeyPressed()) Result = pas.crt.ReadKey();
    return Result;
  };
},["crt"]);
rtl.module("mouse",["System"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  this.InitMouse = function () {
    var Result = false;
    $impl.Install();
    Result = true;
    return Result;
  };
  this.ShowMouse = function () {
    $impl.Install();
    var c = document.getElementById('screen');
    if (c) c.style.cursor = 'default';
  };
  this.HideMouse = function () {
    $impl.Install();
    var c = document.getElementById('screen');
    if (c) c.style.cursor = 'none';
  };
  this.MouseX = function () {
    var Result = 0;
    $impl.Install();
    Result = $impl.MX;
    return Result;
  };
  this.MouseY = function () {
    var Result = 0;
    $impl.Install();
    Result = $impl.MY;
    return Result;
  };
  this.LeftButton = function () {
    var Result = false;
    Result = $impl.BL;
    return Result;
  };
},["Web"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  $impl.Installed = false;
  $impl.MX = 320;
  $impl.MY = 240;
  $impl.BL = false;
  $impl.Install = function () {
    if ($impl.Installed) return;
    $impl.Installed = true;
    var canvas = document.getElementById('screen');
    if (!canvas) return;
    var track = function (e) {
      var r = canvas.getBoundingClientRect();
      // object-fit:contain: the 640×480 drawing is centered at uniform scale.
      var scale = Math.min(r.width / 640, r.height / 480);
      if (scale <= 0) return;
      var ox = (r.width - 640 * scale) / 2;
      var oy = (r.height - 480 * scale) / 2;
      var x = Math.round((e.clientX - r.left - ox) / scale);
      var y = Math.round((e.clientY - r.top - oy) / scale);
      $impl.MX = Math.max(0, Math.min(639, x));
      $impl.MY = Math.max(0, Math.min(479, y));
    };
    // The DOS games sample LeftButton at discrete poll points in their menu
    // loops (await(Yield) between checks). Two failure modes had to be closed:
    //   (1) many synthetic click injectors leave e.buttons === 0 on mousedown,
    //       so the old bitmask-only read NEVER saw the press — the WARWORK menu
    //       could not be left with a programmatic click;
    //   (2) a fast/synthetic click's pressed window can fall entirely BETWEEN
    //       two polls and be missed.
    // Fix: latch by button INDEX on down/up (the index is set even when the
    // bitmask is not), and hold the button "down" for a short grace after
    // release so at least one poll observes every click.
    var GRACE = 140;
    var relTimer = { 0: 0, 1: 0, 2: 0 };
    var slot = { 0: 'BL', 1: 'BC', 2: 'BR' }; // DOM button index → shim field
    var press = function (b) {
      var f = slot[b];
      if (f === undefined) return;
      clearTimeout(relTimer[b]);
      $impl[f] = true;
    };
    var release = function (b) {
      var f = slot[b];
      if (f === undefined) return;
      clearTimeout(relTimer[b]);
      relTimer[b] = setTimeout(function () { $impl[f] = false; }, GRACE);
    };
    document.addEventListener('mousemove', function (e) {
      track(e);
      // Keep a held button latched while dragging (real hardware sets the mask).
      if (e.buttons & 1) $impl.BL = true;
      if (e.buttons & 2) $impl.BR = true;
      if (e.buttons & 4) $impl.BC = true;
    });
    document.addEventListener('mousedown', function (e) { track(e); press(e.button); });
    document.addEventListener('mouseup', function (e) { track(e); release(e.button); });
    // The games poll LeftButton to "click" menu buttons — context menu on
    // right-click would steal the RightButton presses.
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };
});
rtl.module("tpfiles",["System"],function () {
  "use strict";
  var $mod = this;
  this.Halt = function () {
    try { parent.postMessage({ type: 'retro:quit' }, '*'); } catch (e) {}
    throw new Error('halt');
  };
},["crt"]);
rtl.module("nls",["System"],function () {
  "use strict";
  var $mod = this;
  this.GameLang = function () {
    var Result = "";
    Result = "ua";
    Result = (typeof window !== 'undefined' && window.__retroLang === 'en') ? 'en' : 'ua';
    return Result;
  };
  this.Loc = function (en, ua) {
    var Result = "";
    if ($mod.GameLang() === "en") {
      Result = en}
     else Result = ua;
    return Result;
  };
});
rtl.module("program",["System","JS","graph","crt","jarik","mouse","tpfiles","nls"],function () {
  "use strict";
  var $mod = this;
  this.duration = 1000;
  this.frameMs = 45;
  this.zenitka = 2;
  this.plane = 1;
  this.tank = 3;
  this.pmx = 0;
  this.pmy = 0;
  this.bx = 0;
  this.by = 0;
  this.rx = 0;
  this.ry = 0;
  this.bs = 0;
  this.q = 0;
  this.level = 0;
  this.height = "";
  this.bomb = false;
  this.raket = false;
  this.myplane = false;
  this.score = 0;
  this.zx = rtl.arraySetLength(null,0,2);
  this.zry = rtl.arraySetLength(null,0,2);
  this.zrx = rtl.arraySetLength(null,0,2);
  this.z = rtl.arraySetLength(null,false,2);
  this.zr = rtl.arraySetLength(null,false,2);
  this.phx = rtl.arraySetLength(null,0,1);
  this.phy = rtl.arraySetLength(null,0,1);
  this.prx = rtl.arraySetLength(null,0,1);
  this.pry = rtl.arraySetLength(null,0,1);
  this.p = rtl.arraySetLength(null,false,1);
  this.pr = rtl.arraySetLength(null,false,1);
  this.tx = rtl.arraySetLength(null,0,3);
  this.t = rtl.arraySetLength(null,false,3);
  this.tn = rtl.arraySetLength(null,false,3);
  this.Quit = async function () {
    var s = "";
    var i = 0;
    pas.crt.NoSound();
    pas.mouse.HideMouse();
    pas.graph.ClearDevice();
    s = "" + $mod.score;
    pas.graph.SetTextStyle(4,0,35);
    $mod.q += 1;
    for (i = 1; i <= 50; i++) {
      pas.mouse.ShowMouse();
      pas.graph.SetColor(pas.System.Random(14) + 1);
      pas.graph.OutTextXY(1,25,pas.nls.Loc("Game Over","Гру закінчено"));
      pas.graph.OutTextXY(1,135,pas.nls.Loc("Your score","Твій рахунок"));
      pas.graph.OutTextXY(250,250,s);
      pas.crt.Sound(pas.System.Random(5000) + 100);
      await pas.crt.Delay(1000);
      pas.crt.NoSound();
    };
    pas.mouse.HideMouse();
    $mod.myplane = false;
  };
  this.MakePlane = function (color) {
    pas.graph.SetColor(color);
    pas.graph.SetFillStyle(1,color);
    pas.graph.Line($mod.pmx + 3,$mod.pmy - 3,$mod.pmx - 3,$mod.pmy + 3);
    pas.graph.Line($mod.pmx - 3,$mod.pmy + 3,$mod.pmx + 3,$mod.pmy + 3);
    pas.graph.Line($mod.pmx + 3,$mod.pmy - 3,$mod.pmx + 23,$mod.pmy - 3);
    pas.graph.Line($mod.pmx + 23,$mod.pmy - 3,$mod.pmx + 23,$mod.pmy + 3);
    pas.graph.Line($mod.pmx - 3,$mod.pmy + 3,$mod.pmx + 23,$mod.pmy + 3);
    pas.graph.Line($mod.pmx + 17,$mod.pmy - 3,$mod.pmx + 20,$mod.pmy - 10);
    pas.graph.Line($mod.pmx + 20,$mod.pmy - 10,$mod.pmx + 23,$mod.pmy - 10);
    pas.graph.Line($mod.pmx + 23,$mod.pmy - 10,$mod.pmx + 23,$mod.pmy - 3);
    pas.graph.Line($mod.pmx + 7,$mod.pmy,$mod.pmx + 15,$mod.pmy + 7);
    pas.graph.Line($mod.pmx + 15,$mod.pmy + 7,$mod.pmx + 20,$mod.pmy + 7);
    pas.graph.Line($mod.pmx + 20,$mod.pmy + 7,$mod.pmx + 12,$mod.pmy);
    pas.graph.FloodFill($mod.pmx + 16,$mod.pmy + 5,color);
    pas.graph.FloodFill($mod.pmx + 21,$mod.pmy - 9,color);
    pas.graph.FloodFill($mod.pmx + 4,$mod.pmy - 2,color);
  };
  this.MakeHisPlane = function (i, color) {
    pas.graph.SetColor(color);
    pas.graph.SetFillStyle(1,color);
    pas.graph.Line($mod.phx[i - 1] + 3,$mod.phy[i - 1] - 3,$mod.phx[i - 1] - 3,$mod.phy[i - 1] + 3);
    pas.graph.Line($mod.phx[i - 1] - 3,$mod.phy[i - 1] + 3,$mod.phx[i - 1] + 3,$mod.phy[i - 1] + 3);
    pas.graph.Line($mod.phx[i - 1] + 3,$mod.phy[i - 1] - 3,$mod.phx[i - 1] + 23,$mod.phy[i - 1] - 3);
    pas.graph.Line($mod.phx[i - 1] + 23,$mod.phy[i - 1] - 3,$mod.phx[i - 1] + 23,$mod.phy[i - 1] + 3);
    pas.graph.Line($mod.phx[i - 1] - 3,$mod.phy[i - 1] + 3,$mod.phx[i - 1] + 23,$mod.phy[i - 1] + 3);
    pas.graph.Line($mod.phx[i - 1] + 17,$mod.phy[i - 1] - 3,$mod.phx[i - 1] + 20,$mod.phy[i - 1] - 10);
    pas.graph.Line($mod.phx[i - 1] + 20,$mod.phy[i - 1] - 10,$mod.phx[i - 1] + 23,$mod.phy[i - 1] - 10);
    pas.graph.Line($mod.phx[i - 1] + 23,$mod.phy[i - 1] - 10,$mod.phx[i - 1] + 23,$mod.phy[i - 1] - 3);
    pas.graph.Line($mod.phx[i - 1] + 7,$mod.phy[i - 1],$mod.phx[i - 1] + 15,$mod.phy[i - 1] + 7);
    pas.graph.Line($mod.phx[i - 1] + 15,$mod.phy[i - 1] + 7,$mod.phx[i - 1] + 20,$mod.phy[i - 1] + 7);
    pas.graph.Line($mod.phx[i - 1] + 20,$mod.phy[i - 1] + 7,$mod.phx[i - 1] + 12,$mod.phy[i - 1]);
    pas.graph.FloodFill($mod.phx[i - 1] + 16,$mod.phy[i - 1] + 5,color);
    pas.graph.FloodFill($mod.phx[i - 1] + 21,$mod.phy[i - 1] - 9,color);
    pas.graph.FloodFill($mod.phx[i - 1] + 4,$mod.phy[i - 1] - 2,color);
  };
  this.Behind = function () {
    pas.graph.ClearDevice();
    pas.graph.SetColor(1);
    pas.graph.SetFillStyle(1,1);
    pas.graph.Rectangle(1,1,640,300);
    pas.graph.FloodFill(2,2,1);
    pas.graph.SetColor(2);
    pas.graph.SetFillStyle(1,2);
    pas.graph.Rectangle(1,301,640,400);
    pas.graph.FloodFill(2,302,2);
    pas.graph.SetColor(14);
    pas.graph.Circle(580,50,40);
    pas.graph.SetFillStyle(1,14);
    pas.graph.FloodFill(550,50,14);
    pas.graph.SetColor(15);
    pas.graph.SetFillStyle(1,15);
    pas.graph.Circle(50,50,40);
    pas.graph.FloodFill(50,50,15);
    pas.graph.Circle(90,55,40);
    pas.graph.FloodFill(90,65,15);
    pas.graph.Circle(130,45,40);
    pas.graph.FloodFill(130,45,15);
    pas.graph.Circle(250,50,40);
    pas.graph.FloodFill(250,50,15);
    pas.graph.Circle(290,45,40);
    pas.graph.FloodFill(290,25,15);
    pas.graph.Circle(330,55,40);
    pas.graph.FloodFill(330,55,15);
  };
  this.NewBehind = function () {
    var i = 0;
    var j = 0;
    var k = 0;
    $mod.Behind();
    $mod.level += 1;
    for (j = 245; j <= 400; j++) for (k = 450; k <= 480; k++) pas.graph.PutPixel(j,k,0);
    for (i = 1; i <= 2; i++) {
      $mod.z[i - 1] = true;
      $mod.zx[i - 1] = pas.System.Random(600) + 1;
    };
    $mod.raket = false;
    $mod.bomb = false;
    for (i = 1; i <= 1; i++) {
      $mod.pr[i - 1] = false;
      $mod.phy[i - 1] = 200;
      $mod.phx[i - 1] = 600;
      if ($mod.p[i - 1] === false) {
        $mod.p[i - 1] = true;
        $mod.phx[i - 1] = pas.System.Random(400) + 1;
        $mod.phy[i - 1] = pas.System.Random(145) + 150;
      };
    };
    for (i = 1; i <= 3; i++) {
      $mod.tx[i - 1] = pas.System.Random(600) + 40;
      $mod.t[i - 1] = true;
      if (Math.random() > 0.5) {
        $mod.tn[i - 1] = true}
       else $mod.tn[i - 1] = false;
    };
  };
  this.PlaneFire = async function () {
    var c = 0;
    var col = 0;
    var i = 0;
    var j = 0;
    do {
      c = pas.System.Random(5) + 1;
      var $tmp = c;
      if ($tmp === 1) {
        col = 4}
       else if ($tmp === 2) {
        col = 5}
       else if ($tmp === 3) {
        col = 12}
       else if ($tmp === 4) {
        col = 13}
       else if ($tmp === 5) col = 14;
      pas.graph.SetColor(col);
      pas.graph.Circle($mod.pmx + 10,$mod.pmy,25);
      pas.graph.SetFillStyle(1,col);
      pas.graph.FloodFill($mod.pmx - 14,$mod.pmy,col);
      pas.graph.FloodFill($mod.pmx + 34,$mod.pmy,col);
      pas.graph.SetColor(2);
      pas.graph.Rectangle(1,300,640,400);
      pas.graph.SetFillStyle(1,2);
      pas.graph.FloodFill($mod.pmx + 1,301,2);
      pas.graph.FloodFill($mod.pmx + 49,301,2);
      pas.graph.SetColor(2);
      pas.graph.Circle($mod.pmx + 10,$mod.pmy,25);
      pas.crt.Sound(pas.System.Random(1000) + 100);
      await pas.crt.Delay(500);
    } while (!pas.crt.KeyPressed());
    await pas.crt.Delay(1000 * 50);
    for (i = 1; i <= 640; i++) for (var $l = $mod.pmy - 25; $l <= 299; $l++) {
      j = $l;
      pas.graph.PutPixel(i,j,1);
    };
    pas.graph.SetColor(1);
    pas.graph.Circle($mod.pmx,310,20);
    pas.graph.SetFillStyle(1,1);
    pas.graph.FloodFill($mod.pmx,310,1);
    await pas.crt.Delay(50000);
    await $mod.Quit();
  };
  this.PlaneSkyFire = async function () {
    var col = 0;
    do {
      var $tmp = pas.System.Random(5) + 1;
      if ($tmp === 1) {
        col = 4}
       else if ($tmp === 2) {
        col = 5}
       else if ($tmp === 3) {
        col = 12}
       else if ($tmp === 4) {
        col = 13}
       else if ($tmp === 5) col = 14;
      pas.graph.SetColor(col);
      pas.graph.Circle($mod.pmx + 10,$mod.pmy,25);
      pas.graph.SetFillStyle(1,col);
      pas.graph.FloodFill($mod.pmx - 14,$mod.pmy,col);
      pas.graph.FloodFill($mod.pmx + 34,$mod.pmy,col);
      if ($mod.pmy > 275) {
        pas.graph.SetColor(2);
        pas.graph.Rectangle(1,300,640,400);
        pas.graph.SetFillStyle(1,2);
        pas.graph.FloodFill($mod.pmx + 1,301,2);
        pas.graph.FloodFill($mod.pmx + 49,301,2);
        pas.graph.SetColor(2);
        pas.graph.Circle($mod.pmx + 10,$mod.pmy,25);
      };
      pas.crt.Sound(pas.System.Random(1000) + 100);
      await pas.crt.Delay(500);
    } while (!pas.crt.KeyPressed());
    pas.graph.SetColor(1);
    pas.graph.SetFillStyle(1,1);
    pas.graph.Circle($mod.pmx + 10,$mod.pmy,25);
    pas.graph.FloodFill($mod.pmx + 10,$mod.pmy,1);
    for (var $l = $mod.pmy; $l <= 300; $l++) {
      $mod.pmy = $l;
      $mod.MakePlane(1);
      $mod.pmx -= 1;
      $mod.MakePlane(0);
      pas.crt.Sound(pas.System.Random(500) + 100);
      await pas.crt.Delay(1000);
    };
    await $mod.PlaneFire();
    await pas.crt.Delay(50000);
    await $mod.Quit();
  };
  this.PlaneHisSkyFire = async function (i) {
    var c = 0;
    var col = 0;
    var a = 0;
    var k = 0;
    var j = 0;
    for (a = 1; a <= 100; a++) {
      c = pas.System.Random(5) + 1;
      var $tmp = c;
      if ($tmp === 1) {
        col = 4}
       else if ($tmp === 2) {
        col = 5}
       else if ($tmp === 3) {
        col = 12}
       else if ($tmp === 4) {
        col = 13}
       else if ($tmp === 5) col = 14;
      pas.graph.SetColor(col);
      pas.graph.Circle($mod.phx[i - 1] + 10,$mod.phy[i - 1],25);
      pas.graph.SetFillStyle(1,col);
      pas.graph.FloodFill($mod.phx[i - 1] - 14,$mod.phy[i - 1],col);
      pas.graph.FloodFill($mod.phx[i - 1] + 34,$mod.phy[i - 1],col);
      if ($mod.phy[i - 1] > 275) {
        pas.graph.SetColor(2);
        pas.graph.Rectangle(1,300,640,400);
        pas.graph.SetFillStyle(1,2);
        pas.graph.FloodFill($mod.phx[i - 1] + 1,301,2);
        pas.graph.FloodFill($mod.phx[i - 1] + 49,301,2);
        pas.graph.SetColor(2);
        pas.graph.Circle($mod.phx[i - 1] + 10,$mod.phy[i - 1],25);
      };
      pas.crt.Sound(pas.System.Random(1000) + 100);
      await pas.crt.Delay(500);
    };
    for (var $l = $mod.phy[i - 1]; $l <= 300; $l++) {
      a = $l;
      $mod.phy[i - 1] = a;
      $mod.MakeHisPlane(i,1);
      $mod.phx[i - 1] -= 1;
      $mod.MakeHisPlane(i,0);
      pas.crt.Sound(pas.System.Random(500) + 100);
    };
    for (k = 1; k <= 640; k++) for (var $l1 = $mod.phy[i - 1] - 50; $l1 <= 299; $l1++) {
      j = $l1;
      pas.graph.PutPixel(k,j,1);
    };
    pas.graph.SetColor(1);
    pas.graph.Circle($mod.phx[i - 1],310,20);
    pas.graph.SetFillStyle(1,1);
    pas.graph.FloodFill($mod.phx[i - 1],310,1);
  };
  this.BombFire = async function () {
    var c = 0;
    var col = 0;
    var i = 0;
    var j = 0;
    for (i = 1; i <= 50; i++) {
      c = pas.System.Random(5) + 1;
      var $tmp = c;
      if ($tmp === 1) {
        col = 4}
       else if ($tmp === 2) {
        col = 5}
       else if ($tmp === 3) {
        col = 12}
       else if ($tmp === 4) {
        col = 13}
       else if ($tmp === 5) col = 14;
      pas.graph.SetColor(col);
      pas.graph.Circle($mod.bx + 10,$mod.by,25);
      pas.graph.SetFillStyle(1,col);
      pas.graph.FloodFill($mod.bx - 14,$mod.by,col);
      pas.graph.FloodFill($mod.bx + 34,$mod.by,col);
      pas.graph.SetColor(2);
      pas.graph.Rectangle(1,300,640,400);
      pas.graph.SetFillStyle(1,2);
      pas.graph.FloodFill($mod.bx + 1,301,2);
      pas.graph.FloodFill($mod.bx + 39,301,2);
      pas.graph.SetColor(2);
      pas.graph.Circle($mod.bx + 10,$mod.by,25);
      pas.crt.Sound(pas.System.Random(1000) + 100);
      await pas.crt.Delay(1000);
    };
    $mod.bomb = false;
    for (i = 1; i <= 640; i++) for (j = 250; j <= 299; j++) pas.graph.PutPixel(i,j,1);
    pas.graph.SetColor(1);
    if ($mod.by > 310) {
      pas.graph.Circle($mod.bx,$mod.by,20)}
     else pas.graph.Circle($mod.bx,310,20);
    pas.graph.SetFillStyle(1,1);
    pas.graph.FloodFill($mod.bx,310,1);
  };
  this.BombMaker = function (color) {
    pas.graph.SetColor(color);
    pas.graph.SetFillStyle(1,color);
    pas.graph.Circle($mod.bx,$mod.by,3);
    pas.graph.FloodFill($mod.bx,$mod.by,color);
  };
  this.RaketMaker = function (Color) {
    pas.graph.SetColor(Color);
    pas.graph.Line($mod.rx,$mod.ry,$mod.rx - 5,$mod.ry);
  };
  this.MakeRaket = function (i, Color) {
    pas.graph.SetColor(Color);
    pas.graph.Line($mod.prx[i - 1],$mod.pry[i - 1],$mod.prx[i - 1] - 5,$mod.pry[i - 1]);
  };
  this.MakeZRaket = function (Color, i) {
    pas.graph.SetColor(Color);
    pas.graph.Line($mod.zrx[i - 1],$mod.zry[i - 1],$mod.zrx[i - 1],$mod.zry[i - 1] - 5);
  };
  this.ZenitkaRaket = async function (i) {
    var n1 = 0;
    var n2 = 0;
    var j = 0;
    if ($mod.zr[i - 1] === false) {
      n1 = Math.floor(Math.abs($mod.zx[i - 1] - $mod.pmx) / 2);
      n2 = Math.floor((301 - $mod.pmy) / 7);
      if (Math.abs(n1 - n2) <= pas.System.Random(10)) {
        $mod.zr[i - 1] = true;
        $mod.zrx[i - 1] = $mod.zx[i - 1];
        $mod.zry[i - 1] = 295;
      };
    } else {
      $mod.MakeZRaket(1,i);
      $mod.zry[i - 1] = $mod.zry[i - 1] - 7;
      $mod.MakeZRaket(0,i);
      if ((Math.abs($mod.zrx[i - 1] - $mod.pmx) <= 5) && (Math.abs($mod.zry[i - 1] - $mod.pmy) <= 5)) {
        await $mod.PlaneSkyFire();
        $mod.zr[i - 1] = false;
      };
      for (j = 1; j <= 1; j++) if ((Math.abs($mod.zrx[i - 1] - $mod.phx[j - 1]) <= 5) && (Math.abs($mod.zry[i - 1] - $mod.phy[j - 1]) <= 5)) {
        await $mod.PlaneHisSkyFire(j);
        $mod.zr[i - 1] = false;
      };
      if ($mod.zry[i - 1] <= 105) {
        $mod.zr[i - 1] = false;
        $mod.MakeZRaket(1,i);
      };
    };
  };
  this.MakeZenitka = function (i) {
    pas.graph.SetColor(12);
    pas.graph.Line($mod.zx[i - 1],301,$mod.zx[i - 1] - 10,315);
    pas.graph.Line($mod.zx[i - 1],301,$mod.zx[i - 1] + 10,315);
    pas.graph.Line($mod.zx[i - 1] - 10,315,$mod.zx[i - 1] + 10,315);
    pas.graph.SetFillStyle(1,12);
    pas.graph.FloodFill($mod.zx[i - 1],312,12);
    pas.graph.SetColor(4);
    pas.graph.Line($mod.zx[i - 1],301,$mod.zx[i - 1] - 10,315);
    pas.graph.Line($mod.zx[i - 1],301,$mod.zx[i - 1] + 10,315);
    pas.graph.Line($mod.zx[i - 1] - 10,315,$mod.zx[i - 1] + 10,315);
    pas.graph.SetFillStyle(1,4);
    pas.graph.FloodFill($mod.zx[i - 1],312,4);
  };
  this.MakeTank = function (i, c) {
    pas.graph.SetColor(c);
    pas.graph.Arc($mod.tx[i - 1],315,90,270,3);
    pas.graph.Arc($mod.tx[i - 1] + 20,315,270,90,3);
    pas.graph.Line($mod.tx[i - 1],312,$mod.tx[i - 1] + 20,312);
    pas.graph.Line($mod.tx[i - 1],318,$mod.tx[i - 1] + 20,318);
    pas.graph.SetFillStyle(1,c);
    pas.graph.FloodFill($mod.tx[i - 1] + 10,315,c);
    pas.graph.Bar($mod.tx[i - 1] + 3,305,$mod.tx[i - 1] + 15,312);
    pas.graph.Bar($mod.tx[i - 1] + 15,307,$mod.tx[i - 1] + 30,310);
  };
  this.Game = async function () {
    var key = "";
    var i = 0;
    var j = 0;
    var k = 0;
    var q = 0;
    var s = "";
    $mod.score = 0;
    $mod.myplane = true;
    $mod.pmx = 500;
    $mod.pmy = 150;
    $mod.NewBehind();
    pas.mouse.HideMouse();
    $mod.Behind();
    $mod.MakePlane(0);
    do {
      key = pas.jarik.InKey();
      var $tmp = key;
      if ($tmp === "H") {
        $mod.MakePlane(1);
        $mod.pmy -= 1;
        $mod.MakePlane(0);
      } else if ($tmp === "K") {
        $mod.MakePlane(1);
        $mod.pmx -= 1;
        $mod.MakePlane(0);
      } else if ($tmp === "M") {
        $mod.MakePlane(1);
        $mod.pmx += 1;
        $mod.MakePlane(0);
      } else if ($tmp === "P") {
        $mod.MakePlane(1);
        $mod.pmy += 1;
        $mod.MakePlane(0);
      } else if (($tmp === "B") || ($tmp === "b")) {
        if ($mod.bomb === false) {
          $mod.bx = $mod.pmx + 15;
          $mod.by = $mod.pmy + 10;
          $mod.bomb = true;
          $mod.bs = 1;
        }}
       else if (($tmp === "R") || ($tmp === "r")) if ($mod.raket === false) {
        $mod.rx = $mod.pmx - 10;
        $mod.ry = $mod.pmy - 3;
        $mod.raket = true;
      };
      pas.crt.Sound(250);
      if ($mod.pmx <= 1) {
        $mod.MakePlane(1);
        $mod.NewBehind();
        $mod.score = $mod.score + 100;
        $mod.pmx = 614;
        $mod.MakePlane(0);
      };
      if ($mod.pmx >= 615) {
        $mod.MakePlane(1);
        $mod.pmx = 2;
        $mod.MakePlane(0);
      };
      if ($mod.pmy <= 110) {
        $mod.MakePlane(1);
        $mod.pmy = 110;
        $mod.MakePlane(0);
      };
      if ($mod.pmy >= 295) {
        $mod.MakePlane(1);
        $mod.pmy = 290;
        $mod.MakePlane(0);
      };
      $mod.MakePlane(1);
      $mod.pmx = $mod.pmx - 2;
      $mod.MakePlane(0);
      if ($mod.bomb) {
        $mod.BombMaker(1);
        $mod.by = $mod.by + Math.floor($mod.bs / 4);
        $mod.bs += 1;
        $mod.BombMaker(0);
        pas.crt.Sound(50);
      };
      if ($mod.raket) {
        $mod.RaketMaker(1);
        $mod.rx = $mod.rx - 7;
        $mod.RaketMaker(0);
        pas.crt.Sound(1000);
      };
      for (q = 1; q <= 3; q++) {
        if ($mod.t[q - 1]) {
          $mod.MakeTank(q,2);
          if ($mod.tn[q - 1]) {
            $mod.tx[q - 1] -= 1}
           else $mod.tx[q - 1] += 1;
          if ($mod.tx[q - 1] <= 5) $mod.tn[q - 1] = false;
          if ($mod.tx[q - 1] >= 635) $mod.tn[q - 1] = true;
          if ((pas.graph.GetPixel($mod.tx[q - 1] - 10,305) === 1) && $mod.tn[q - 1]) $mod.tn[q - 1] = false;
          if ((pas.graph.GetPixel($mod.tx[q - 1] + 35,305) === 1) && !$mod.tn[q - 1]) $mod.tn[q - 1] = true;
          $mod.MakeTank(q,8);
          if ((Math.abs($mod.tx[q - 1] - $mod.bx) <= 15) && $mod.bomb && ($mod.by >= 295)) {
            $mod.t[q - 1] = false;
            for (k = 500; k <= 640; k++) for (j = 425; j <= 480; j++) pas.graph.PutPixel(k,j,0);
            $mod.score = $mod.score + 500;
          };
        };
      };
      if (($mod.rx <= 1) && ($mod.raket === true)) {
        $mod.RaketMaker(1);
        $mod.raket = false;
      };
      for (i = 100; i <= 164; i++) for (j = 425; j <= 450; j++) pas.graph.PutPixel(i,j,0);
      pas.graph.SetColor(15);
      pas.graph.SetTextStyle(1,0,1);
      $mod.height = "" + ((300 - $mod.pmy) * 50);
      pas.graph.OutTextXY(10,425,pas.nls.Loc("Height - ","Висота - "));
      pas.graph.OutTextXY(100,425,$mod.height);
      pas.graph.OutTextXY(165,425,pas.nls.Loc(" metres"," метрів"));
      pas.graph.OutTextXY(350,425,pas.nls.Loc("Score - ","Рахунок - "));
      pas.graph.OutTextXY(245,450,pas.nls.Loc("Level - ","Рівень - "));
      s = "" + $mod.score;
      pas.graph.OutTextXY(500,425,s);
      s = "" + $mod.level;
      pas.graph.OutTextXY(345,450,s);
      for (i = 1; i <= 2; i++) {
        if (($mod.z[i - 1] === true) && ($mod.bomb === true) && (Math.abs($mod.bx - $mod.zx[i - 1]) <= 25) && ($mod.by >= 295)) {
          for (k = 500; k <= 640; k++) for (j = 425; j <= 480; j++) pas.graph.PutPixel(k,j,0);
          $mod.score = $mod.score + 250;
          $mod.z[i - 1] = false;
        };
        if ($mod.z[i - 1]) {
          $mod.MakeZenitka(i);
          await $mod.ZenitkaRaket(i);
        };
      };
      if (($mod.by >= 310) && ($mod.bomb === true)) await $mod.BombFire();
      if (((300 - $mod.pmy) * 50) < 500) await $mod.PlaneFire();
      for (i = 1; i <= 1; i++) {
        if ($mod.p[i - 1]) {
          $mod.MakeHisPlane(i,1);
          if (Math.random() > 0.5) {
            if ($mod.phx[i - 1] < $mod.pmx) $mod.phx[i - 1] += 1;
            if ($mod.phy[i - 1] > $mod.pmy) $mod.phy[i - 1] -= 1;
            if ($mod.phy[i - 1] < $mod.pmy) $mod.phy[i - 1] += 1;
            if (Math.abs($mod.phx[i - 1] - $mod.pmx) <= 5) $mod.phx[i - 1] = $mod.phx[i - 1] + pas.System.Random(75) + 50;
            if (((-1 * ($mod.phy[i - 1] - $mod.pmy)) === pas.System.Random(25)) && ($mod.pr[i - 1] === false)) {
              $mod.prx[i - 1] = $mod.phx[i - 1] - 5;
              $mod.pry[i - 1] = $mod.phy[i - 1];
              $mod.pr[i - 1] = true;
            };
            if ($mod.pr[i - 1]) {
              $mod.MakeRaket(i,1);
              $mod.prx[i - 1] = $mod.prx[i - 1] - 7;
              $mod.MakeRaket(i,0);
              if ((Math.abs($mod.prx[i - 1] - $mod.pmx) <= 5) && (Math.abs($mod.pry[i - 1] - $mod.pmy) <= 5)) await $mod.PlaneSkyFire();
              if ($mod.prx[i - 1] <= 1) $mod.pr[i - 1] = false;
              pas.crt.Sound(1000);
            };
          };
          var $tmp1 = pas.System.Random(5) + 1;
          if ($tmp1 === 1) {
            $mod.phx[i - 1] += 1}
           else if ($tmp1 === 2) {
            $mod.phx[i - 1] -= 1}
           else if ($tmp1 === 3) {
            $mod.phy[i - 1] += 1}
           else if ($tmp1 === 4) $mod.phy[i - 1] -= 1;
          if ($mod.pmx === 10) {
            $mod.MakeHisPlane(i,1);
            $mod.phx[i - 1] = 600;
            $mod.MakeHisPlane(i,4);
          };
          $mod.phx[i - 1] = $mod.phx[i - 1] - 2;
          if ($mod.phx[i - 1] === 1) {
            $mod.MakeHisPlane(i,1);
            $mod.phx[i - 1] = 600;
            $mod.MakeHisPlane(i,4);
          };
          if (((300 - $mod.phy[i - 1]) * 50) < 500) {
            await $mod.PlaneHisSkyFire(i);
            for (k = 500; k <= 640; k++) for (j = 425; j <= 480; j++) pas.graph.PutPixel(k,j,0);
            $mod.score = $mod.score + 500;
            $mod.p[i - 1] = false;
          };
          if ((Math.abs($mod.phx[i - 1] - $mod.pmx) <= 5) && (Math.abs($mod.phy[i - 1] - $mod.pmy) <= 5)) await $mod.PlaneSkyFire();
          if ($mod.raket) {
            if ((Math.abs($mod.phx[i - 1] - $mod.rx) <= 5) && (Math.abs($mod.phy[i - 1] - $mod.ry) <= 5)) {
              await $mod.PlaneHisSkyFire(i);
              $mod.score = $mod.score + 1000;
              $mod.p[i - 1] = false;
              $mod.Behind();
              for (k = 500; k <= 640; k++) for (j = 425; j <= 480; j++) pas.graph.PutPixel(k,j,0);
            };
          };
          if ($mod.p[i - 1]) $mod.MakeHisPlane(i,4);
        };
      };
      await pas.crt.FrameDelay(45);
      pas.crt.NoSound();
    } while (!(!$mod.myplane || (key === "\x1B")));
  };
  this.MainMenu = async function () {
    var Result = 0;
    var choice = 0;
    pas.mouse.HideMouse();
    pas.graph.SetColor(6);
    pas.graph.SetFillStyle(1,6);
    pas.graph.Bar(1,1,640,480);
    pas.graph.SetColor(8);
    pas.graph.SetFillStyle(1,8);
    pas.graph.Bar(200,50,400,100);
    pas.graph.Bar(200,150,400,200);
    pas.graph.Bar(200,250,400,300);
    pas.graph.SetColor(7);
    pas.graph.SetTextStyle(3,0,4);
    pas.graph.OutTextXY(220,50,pas.nls.Loc("Start game","Почати гру"));
    pas.graph.OutTextXY(220,150,pas.nls.Loc("Information","Інформація"));
    pas.graph.OutTextXY(270,250,pas.nls.Loc("Quit","Вийти"));
    choice = 0;
    do {
      await pas.crt.Yield();
      pas.mouse.ShowMouse();
      if ((pas.mouse.MouseX() > 200) && (pas.mouse.MouseX() < 400) && (pas.mouse.MouseY() > 50) && (pas.mouse.MouseY() < 400) && pas.mouse.LeftButton()) {
        if ((pas.mouse.MouseY() > 50) && (pas.mouse.MouseY() < 100)) choice = 1;
        if ((pas.mouse.MouseY() > 150) && (pas.mouse.MouseY() < 200)) choice = 2;
        if ((pas.mouse.MouseY() > 250) && (pas.mouse.MouseY() < 300)) choice = 3;
      };
    } while (!(choice !== 0));
    Result = choice;
    return Result;
  };
  this.Information = async function () {
    var i = 0;
    pas.mouse.HideMouse();
    pas.graph.SetColor(6);
    pas.graph.SetFillStyle(1,6);
    pas.graph.Bar(1,1,640,480);
    pas.graph.SetColor(7);
    pas.graph.SetTextStyle(4,0,15);
    pas.graph.OutTextXY(75,25,"WarWork");
    pas.graph.SetTextStyle(5,0,5);
    pas.graph.OutTextXY(10,200,"CopyRight By Yermilov Yaroslav");
    pas.graph.OutTextXY(75,300,"Version 1.0 April 2005");
    pas.graph.SetTextStyle(8,0,5);
    pas.graph.SetColor(7);
    pas.graph.SetFillStyle(1,7);
    pas.graph.Bar(80,400,480,450);
    pas.graph.SetColor(8);
    pas.graph.OutTextXY(140,385,pas.nls.Loc("MAIN MENU","ГОЛОВНЕ МЕНЮ"));
    pas.mouse.ShowMouse();
    do {
      await pas.crt.Yield();
    } while (!((pas.mouse.MouseX() > 80) && (pas.mouse.MouseX() < 480) && (pas.mouse.MouseY() > 400) && (pas.mouse.MouseY() < 450) && pas.mouse.LeftButton()));
    do {
      i = pas.System.Trunc(await $mod.MainMenu());
      var $tmp = i;
      if ($tmp === 1) {
        await $mod.Game()}
       else if ($tmp === 2) {
        await $mod.Information()}
       else if ($tmp === 3) pas.tpfiles.Halt();
    } while (!false);
  };
  this.StartGame = async function () {
    var i = 0;
    $mod.q = 0;
    $mod.score = 0;
    $mod.pmx = 500;
    $mod.pmy = 150;
    $mod.myplane = true;
    $mod.raket = false;
    $mod.bomb = false;
    $mod.level = 0;
    pas.crt.Randomize();
    for (i = 1; i <= 2; i++) {
      $mod.z[i - 1] = true;
      $mod.zx[i - 1] = pas.System.Random(640) + 1;
      $mod.zr[i - 1] = true;
    };
    for (i = 1; i <= 1; i++) {
      $mod.p[i - 1] = true;
      $mod.phx[i - 1] = pas.System.Random(400) + 1;
      $mod.phy[i - 1] = pas.System.Random(145) + 150;
      $mod.pr[i - 1] = false;
    };
    for (i = 1; i <= 3; i++) {
      $mod.t[i - 1] = true;
      $mod.tx[i - 1] = pas.System.Random(600) + 40;
      if (Math.random() > 0.5) {
        $mod.tn[i - 1] = true}
       else $mod.tn[i - 1] = false;
    };
    pas.graph.SetColor(7);
    pas.graph.SetFillStyle(1,7);
    pas.graph.Rectangle(80,400,480,450);
    pas.graph.FloodFill(181,401,7);
    pas.mouse.InitMouse();
    pas.mouse.ShowMouse();
    do {
      pas.graph.SetColor(pas.System.Random(15) + 1);
      pas.graph.SetTextStyle(4,0,15);
      pas.graph.OutTextXY(75,25,"WarWork");
      pas.graph.SetTextStyle(5,0,5);
      pas.graph.OutTextXY(10,200,"CopyRight By Yermilov Yaroslav");
      pas.graph.OutTextXY(75,300,"Version 1.0 April 2005");
      pas.graph.SetTextStyle(8,0,5);
      pas.graph.OutTextXY(140,385,pas.nls.Loc("MAIN MENU","ГОЛОВНЕ МЕНЮ"));
      pas.crt.Sound(pas.System.Random(5000) + 100);
      await pas.crt.Delay(1000 * 3);
      pas.crt.NoSound();
      if (pas.jarik.InKey() === "\x1B") await $mod.Quit();
    } while (!(pas.mouse.LeftButton() && (pas.mouse.MouseX() > 80) && (pas.mouse.MouseX() < 480) && (pas.mouse.MouseY() > 400) && (pas.mouse.MouseY() < 450)));
    pas.mouse.HideMouse();
    pas.graph.ClearDevice();
    i = pas.System.Trunc(await $mod.MainMenu());
    var $tmp = i;
    if ($tmp === 1) {
      await $mod.Game()}
     else if ($tmp === 2) {
      await $mod.Information()}
     else if ($tmp === 3) pas.tpfiles.Halt();
  };
  this.InitGraphWarWork = async function () {
    var Gd = 0;
    var Gm = 0;
    var ErrorCode = 0;
    var i = 0;
    Gd = 0;
    pas.graph.InitGraph({get: function () {
        return Gd;
      }, set: function (v) {
        Gd = v;
      }},{get: function () {
        return Gm;
      }, set: function (v) {
        Gm = v;
      }},"");
    ErrorCode = pas.graph.GraphResult();
    if (ErrorCode === 0) {
      await $mod.StartGame();
      do {
        i = pas.System.Trunc(await $mod.MainMenu());
        var $tmp = i;
        if ($tmp === 1) {
          await $mod.Game()}
         else if ($tmp === 2) {
          await $mod.Information()}
         else if ($tmp === 3) pas.tpfiles.Halt();
      } while (!false);
    } else {
      pas.crt.TextBackground(0);
      pas.crt.TextColor(15);
      pas.crt.ClrScr();
      pas.System.Write(pas.nls.Loc("Error:","Помилка:"),pas.graph.GraphErrorMsg(ErrorCode));
      pas.crt.Readln();
    };
    await pas.crt.Delay(10000);
    pas.graph.CloseGraph();
  };
  $mod.$main = function () {
    pas.crt.DelayScale = 0.004;
    pas.crt.MinDelayMs = 20;
    $mod.InitGraphWarWork();
  };
});
