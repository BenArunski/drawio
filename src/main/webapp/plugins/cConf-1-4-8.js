/**
 * Plugin for embed mode in Confluence Connect post version 1.4.8
 */
Draw.loadPlugin(function(ui)
{
	// Extracts macro data from JSON protocol
	var macroData = {};
	
	mxEvent.addListener(window, 'message', mxUtils.bind(this, function(evt)
	{
		var data = evt.data;

		try
		{
			data = JSON.parse(data);
			
			if (data.action == 'load')
			{
				if (data.macroData != null) 
				{
					macroData = data.macroData;

					if (ui.format != null)
					{
						ui.format.refresh();
					}
				}
				
				ui.initComments(macroData.contentId || macroData.custContentId);
				macroData.diagramDisplayName = data.title;
			}
		}
		catch (e)
		{
			data = null;
		}
	}));

	var renameAction = ui.actions.get("rename"); 

	renameAction.visible = true;
	
	renameAction.isEnabled = function()
	{
		return macroData.diagramDisplayName != null;
	}
	
	function descriptorChangedListener()
	{
		var curFile = ui.getCurrentFile();
		var fileTitle = curFile.getTitle();
		
		//Update file name in the UI
		var tmp = document.createElement('span');
		mxUtils.write(tmp, mxUtils.htmlEntities(fileTitle));
		
		if (ui.embedFilenameSpan != null)
		{
			ui.embedFilenameSpan.parentNode.removeChild(ui.embedFilenameSpan);
		}

		ui.buttonContainer.appendChild(tmp);
		ui.embedFilenameSpan = tmp;
		macroData.diagramDisplayName = fileTitle;
		
		var vSettings = curFile.desc.viewerSettings;
		
		if (vSettings != null)
		{
			macroData.tbstyle = vSettings.tbstyle;
			macroData.links = vSettings.links;
			macroData.simple = vSettings.simple;
			macroData.lbox = vSettings.lbox;
			macroData.zoom = vSettings.zoom;
			macroData.pCenter = vSettings.pCenter;
			macroData.aspect =	vSettings.aspect;
			macroData.hiResPreview = vSettings.hiResPreview;
			
			if (ui.format != null)
			{
				ui.format.refresh();
			}
		}
	};

	var xdm_e = decodeURIComponent(urlParams['site']);
	var license = urlParams['atlas-lic'];
	
	ui.checkConfLicense(license, xdm_e, function(licenseValid)
	{
		if (!licenseValid)
	    {
			ui.menus.get('file').funct = function(menu, parent)
			{
				menu.addItem(mxResources.get('licenseRequired'), null, function()
				{
					// do nothing
				}, parent, null, false);
			}
			
			ui.menus.get('insertAdvanced').funct = function(menu, parent)
			{
				menu.addItem(mxResources.get('licenseRequired'), null, function()
				{
					// do nothing
				}, parent, null, false);
			}
			
			if (typeof(MathJax) !== 'undefined')
			{
				ui.actions.get('mathematicalTypesetting').funct = function()
				{
					ui.alert(mxResources.get('licenseRequired'));
				};
			}
			
			EditorUi.prototype.insertPage = function(page, index)
			{
				this.alert(mxResources.get('licenseRequired'));
			};
			
			Sidebar.prototype.searchEntries = function(searchTerms, count, page, success, error)
			{
				success();
			};

			Sidebar.prototype.insertSearchHint = function(div, searchTerm, count, page, results, len, more, terms)
			{
				var link = document.createElement('div');
				link.className = 'geTitle';
				link.style.cssText = 'background-color:#ffd350;border-radius:6px;color:black;' +
					'border:1px solid black !important;text-align:center;white-space:normal;' +
					'padding:6px 0px 6px 0px !important;margin:4px 4px 8px 2px;font-size:12px;';
				mxUtils.write(link, mxResources.get('licenseRequired'));
				div.appendChild(link);
			};

			ui.actions.addAction('support...', function()
			{
				ui.remoteInvoke('getPageInfo', [true], null, function(info)
				{
					var url = info.url;
					
					if (url != null)
					{
						var wikiPos = url.indexOf('/wiki/');
						
						if (wikiPos > -1)
						{
							url = url.substring(0, wikiPos);
						}
						
						ui.openLink(url + '/wiki/plugins/servlet/ac/com.mxgraph.confluence.plugins.diagramly/support');
					}
					else
					{
						ui.openLink('https://about.draw.io/support/');
					}
				}, function()
				{
					ui.openLink('https://about.draw.io/support/');
				});
			});
	
			DrawioFileSync.prototype.fileChangedNotify = function() 
			{
				//Disable RT syncing
			};
			
			ui.importFiles = function() 
			{
				//Disable DnD and file import
				ui.alert(mxResources.get('licenseRequired'));	
			}
			
			//Disable comments
			ui.getComments = function(success, error)
			{
				error({message: mxResources.get('licenseRequired')});
			}
			
			ui.addComment = function(comment, success, error)
			{
				error();
			}
	    }
	});

	renameAction.funct = function()
	{
		var dlg = new FilenameDialog(ui, macroData.diagramDisplayName || "",
				mxResources.get('rename'), function(newName)
		{
			if (newName != null && newName.length > 0)
			{
				//TODO This is not needed with RT since title is added to desc
				macroData.diagramDisplayName = newName;
				var parent = window.opener || window.parent;
				parent.postMessage(JSON.stringify({event: 'rename', name: newName}), '*'); 
				
				//Update and sync new name
				ui.getCurrentFile().rename(newName);
			}
		}, mxResources.get('rename'), function(name)
		{
			var err = "";
			if (name == null || name.length == 0)
			{
				err = 'Filename too short';
			}
			else if (/[&\*+=\\;/{}|\":<>\?~]/g.test(name))
			{        
				err = 'Invalid characters \\ / | : { } < > & + ? = ; * " ~';
			}
			else
			{
				return true;
			}
			
			ui.showError(mxResources.get('error'), err, mxResources.get('ok'));
			return false;
		});
		ui.showDialog(dlg.container, 300, 80, true, true);
		dlg.init();
	}

	// Returns modified macro data to client
	var uiCreateLoadMessage = ui.createLoadMessage;
	
	ui.createLoadMessage = function(eventName)
	{
		var msg = uiCreateLoadMessage.apply(this, arguments);
		
		if (eventName == 'export')
		{
			msg.macroData = macroData;
			
			var desc = ui.getCurrentFile().getDescriptor();
			
			//Until app.min.js is propagated, this code is necessary
			if (desc != null)
			{
				if (desc.key == null)
				{
					desc.key = Editor.guid(32);
					desc.channel = Editor.guid(32);
					desc.etagP = Editor.guid(32);
					desc.title = macroData.diagramDisplayName;
				}
				else if (desc.title)
				{
					macroData.diagramDisplayName = desc.title;
				}
				
				msg.desc = desc;
			}
			else
			{
				msg.desc = {};
			}
		}

		return msg;
	};

	// Adds new section for confluence cloud
	var diagramFormatPanelInit = DiagramFormatPanel.prototype.init;
	
	DiagramFormatPanel.prototype.init = function()
	{
		this.container.appendChild(this.addViewerOptions(this.createPanel()));
		
		diagramFormatPanelInit.apply(this, arguments);
	};

	// Adds viewer config to style options and refreshes
	DiagramFormatPanel.prototype.addViewerOptions = function(div)
	{
		var ui = this.editorUi;
		var editor = ui.editor;
		var graph = editor.graph;
	
		div.appendChild(this.createTitle(mxResources.get('viewerSettings')));	
		
		// Viewer simple
		div.appendChild(this.createOption(mxResources.get('simpleViewer'), function()
		{
			return macroData.simple == '1';
		}, function(checked)
		{
			macroData.simple = (checked) ? '1' : '0';
		}));

		// Viewer lightbox
		div.appendChild(this.createOption(mxResources.get('lightbox'), function()
		{
			return macroData.lbox != '0';
		}, function(checked)
		{
			macroData.lbox = (checked) ? '1' : '0';
		}));
		
		// Viewer centering
		div.appendChild(this.createOption(mxResources.get('center'), function()
		{
			return macroData.pCenter == '1';
		}, function(checked)
		{
			macroData.pCenter = (checked) ? '1' : '0';
		}));

		// High Resolution Preview
		div.appendChild(this.createOption(mxResources.get('hiResPreview', null, 'High Res Preview'), function()
		{
			return (macroData.hiResPreview == null && Editor.config != null && Editor.config.hiResPreview) || macroData.hiResPreview == '1';
		}, function(checked)
		{
			macroData.hiResPreview = (checked) ? '1' : '0';
			ui.remoteInvoke('setHiResPreview', [checked], null, function(){}, function(){}); //Notify plugin of the change, ignoring both success and error callbacks
		}));
		
		// Toolbar
		var stylePanel = this.createPanel();
		stylePanel.style.position = 'relative';
		stylePanel.style.borderWidth = '0px';
		stylePanel.style.marginLeft = '0px';
		stylePanel.style.paddingTop = '8px';
		stylePanel.style.paddingBottom = '4px';
		stylePanel.style.fontWeight = 'normal';
		stylePanel.className = 'geToolbarContainer';

		mxUtils.write(stylePanel, mxResources.get('toolbar'));
		
		// Adds toolbar options
		var tbSelect = document.createElement('select');
		tbSelect.style.position = 'absolute';
		tbSelect.style.right = '20px';
		tbSelect.style.width = '97px';
		tbSelect.style.marginTop = '-2px';
		
		var opts = [{value: 'top', title: mxResources.get('top')},
			{value: 'inline', title: mxResources.get('embed')},
			{value: 'hidden', title: mxResources.get('hidden')}]
		var validTb = false;

		for (var i = 0; i < opts.length; i++)
		{
			validTb = validTb || macroData.tbstyle == opts[i].value;
			var tbOption = document.createElement('option');
			tbOption.setAttribute('value', opts[i].value);
			mxUtils.write(tbOption, opts[i].title);
			tbSelect.appendChild(tbOption);
		}
		
		tbSelect.value = (validTb) ? macroData.tbstyle : 'top';
		stylePanel.appendChild(tbSelect);
		div.appendChild(stylePanel);
		
		mxEvent.addListener(tbSelect, 'change', function(evt)
		{
			macroData.tbstyle = tbSelect.value;
			mxEvent.consume(evt);
		});

		// Links
		stylePanel = stylePanel.cloneNode(false);
		stylePanel.style.paddingTop = '4px';
		mxUtils.write(stylePanel, mxResources.get('links'));
		
		// Adds links options
		var linksSelect = document.createElement('select');
		linksSelect.style.position = 'absolute';
		linksSelect.style.right = '20px';
		linksSelect.style.width = '97px';
		linksSelect.style.marginTop = '-2px';

		var opts = [{value: 'auto', title: mxResources.get('automatic')},
			{value: 'blank', title: mxResources.get('openInNewWindow')},
			{value: 'self', title: mxResources.get('openInThisWindow')}]
		var validLinks = false;

		for (var i = 0; i < opts.length; i++)
		{
			validLinks = validLinks || macroData.links == opts[i].value;
			var linkOption = document.createElement('option');
			linkOption.setAttribute('value', opts[i].value);
			mxUtils.write(linkOption, opts[i].title);
			linksSelect.appendChild(linkOption);
		}
		
		linksSelect.value = (validLinks) ? macroData.links : 'auto';
		stylePanel.appendChild(linksSelect);
		div.appendChild(stylePanel);
		
		mxEvent.addListener(linksSelect, 'change', function(evt)
		{
			macroData.links = linksSelect.value;
			mxEvent.consume(evt);
		});

		// Zoom
		var zoomOpt = this.createRelativeOption(mxResources.get('zoom'), null, null, function(input)
		{
			var value = (input.value == '') ? 100 : parseInt(input.value);
			value = Math.max(0, (isNaN(value)) ? 100 : value);
			input.value = value + ' %';
			macroData.zoom = value / 100;
		}, function(input)
		{
			input.value = (parseFloat(macroData.zoom || 1) * 100) + '%';
		});
		
		zoomOpt.style.fontWeight = 'normal';
		zoomOpt.style.paddingBottom = '6px';
		zoomOpt.style.paddingTop = '6px';
		zoomOpt.style.border = 'none';
		
		div.appendChild(zoomOpt);
		
		//Page and layers settings
		div.appendChild(this.createTitle(mxResources.get('pageLayers', null, 'Page and Layers')));
		
		var hasAspect = false;
		var pageId = null, layerIds = null;
		
		var customizeBtn = mxUtils.button(mxResources.get('customize', null, 'Customize'), function()
		{
			
			var dlg = new AspectDialog(ui, pageId, layerIds, function(info)
			{
				pageId = info.pageId;
				layerIds = info.layerIds;
				macroData.aspect = pageId + ' ' + layerIds.join(' ');
				ui.remoteInvoke('setAspect', [macroData.aspect], null, function(){}, function(){}); //Notify plugin of the change, ignoring both success and error callbacks
			});
			
			ui.showDialog(dlg.container, 700, 465, true, true);
			dlg.init();
		});
		
		customizeBtn.className = 'geColorBtn';
		customizeBtn.style.marginLeft = '10px';
		customizeBtn.style.padding = '2px';
		customizeBtn.setAttribute('disabled', 'disabled');
		
		if (macroData.aspect != null)
		{
			var aspectArray = macroData.aspect.split(' ');
			
			if (aspectArray.length > 1)
			{
				pageId = aspectArray[0];
				layerIds = aspectArray.slice(1);
				hasAspect = true;
				customizeBtn.removeAttribute('disabled');
			}
		}
		
		var firstPageRadio = ui.addRadiobox(div, 'pageLayers', mxResources.get('firstPage', null, 'First Page (All Layers)'), !hasAspect);
		firstPageRadio.style.marginTop = '4px';
		
		mxEvent.addListener(firstPageRadio, 'change', function()
		{
			if (this.checked)
			{
				macroData.aspect = null;
				ui.remoteInvoke('setAspect', [macroData.aspect], null, function(){}, function(){}); //Notify plugin of the change, ignoring both success and error callbacks
				customizeBtn.setAttribute('disabled', 'disabled');
			}
		});
		
		var currentStateRadio = ui.addRadiobox(div, 'pageLayers', mxResources.get('curEditorState', null, 'Current Editor State'), false);
		currentStateRadio.style.marginTop = '8px';
		
		mxEvent.addListener(currentStateRadio, 'change', function()
		{
			if (this.checked)
			{
				var curPage = ui.updatePageRoot(ui.currentPage);
				var layerIds = [], layers = curPage.root.children;
				
				for (var i = 0; i < layers.length; i++)
				{
					if (layers[i].visible != false)
					{
						layerIds.push(layers[i].id);
					}
				}

				macroData.aspect = curPage.getId() + ' ' + layerIds.join(' ');
				ui.remoteInvoke('setAspect', [macroData.aspect], null, function(){}, function(){}); //Notify plugin of the change, ignoring both success and error callbacks
				customizeBtn.setAttribute('disabled', 'disabled');
			}
		});

		var customStateRadio = ui.addRadiobox(div, 'pageLayers', mxResources.get('custom', null, 'Custom'), hasAspect, false, true);
		customStateRadio.style.marginTop = '8px';
		
		mxEvent.addListener(customStateRadio, 'change', function()
		{
			if (this.checked)
			{
				customizeBtn.removeAttribute('disabled');
			}
		});

		div.appendChild(customizeBtn);

		return div;
	};
	
	if (ui.format != null)
	{
		ui.format.refresh();
	}
	
	//Adding Link to Confluence Page Anchor
	
	var origLinkDialog = LinkDialog;
	
	LinkDialog = function(editorUi, initialValue, btnLabel, fn, showPages)
	{
		function modFn(link, selDoc)
		{
			if (anchorRadio.checked)
			{
				fn('data:confluence/anchor,' + anchorInput.value);
			}
			else 
			{
				fn(link, selDoc);
			}
		};
		
		origLinkDialog.call(this, editorUi, initialValue, btnLabel, modFn, showPages);
		
		var inner = this.container.querySelector('.geTitle');
		
		var lbl = document.createElement('div');
		mxUtils.write(lbl, mxResources.get('confAnchor') + ':');
		inner.appendChild(lbl);
		
		var anchorRadio = document.createElement('input');
		anchorRadio.style.cssText = 'margin-right:8px;margin-bottom:8px;';
		anchorRadio.setAttribute('value', 'url');
		anchorRadio.setAttribute('type', 'radio');
		anchorRadio.setAttribute('name', 'current-linkdialog');
		
		var anchorInput = document.createElement('input');
		anchorInput.setAttribute('placeholder', mxResources.get('confAnchor'));
		anchorInput.setAttribute('type', 'text');
		anchorInput.style.marginTop = '6px';
		anchorInput.style.width = '420px';
		anchorInput.style.backgroundImage = 'url(\'' + Dialog.prototype.clearImage + '\')';
		anchorInput.style.backgroundRepeat = 'no-repeat';
		anchorInput.style.backgroundPosition = '100% 50%';
		anchorInput.style.paddingRight = '14px';

		var cross = document.createElement('div');
		cross.setAttribute('title', mxResources.get('reset'));
		cross.style.position = 'relative';
		cross.style.left = '-16px';
		cross.style.width = '12px';
		cross.style.height = '14px';
		cross.style.cursor = 'pointer';
		
		// Workaround for inline-block not supported in IE
		cross.style.display = (mxClient.IS_VML) ? 'inline' : 'inline-block';
		cross.style.top = ((mxClient.IS_VML) ? 0 : 3) + 'px';
		
		// Needed to block event transparency in IE
		cross.style.background = 'url(\'' + editorUi.editor.transparentImage + '\')';

		mxEvent.addListener(cross, 'click', function()
		{
			anchorInput.value = '';
			anchorInput.focus();
		});
		
		if (initialValue != null && initialValue.substring(0, 23) == 'data:confluence/anchor,')
		{
			inner.querySelector('input[type="text"]').value = '';
			anchorInput.setAttribute('value', initialValue.substring(23));
			anchorRadio.setAttribute('checked', 'checked');
			anchorRadio.defaultChecked = true;
		}
		
		mxEvent.addListener(anchorInput, 'focus', function()
		{
			anchorRadio.setAttribute('checked', 'checked');
			anchorRadio.checked = true;
		});
		
		mxEvent.addListener(anchorInput, 'keypress', function(e)
		{
			if (e.keyCode == 13 && anchorRadio.checked) //We cannot get other inputs precisely
			{
				editorUi.hideDialog();
				fn('data:confluence/anchor,' + anchorInput.value);
			}
		});
		
		inner.appendChild(anchorRadio);
		inner.appendChild(anchorInput);
		inner.appendChild(cross);
		
		var origInit = this.init;
		
		this.init = function()
		{
			origInit.apply(this, arguments);
			
			if (anchorRadio.checked)
			{
				anchorInput.focus();
			}
		};
	};

	mxUtils.extend(LinkDialog, origLinkDialog);
	
	ui.showLinkDialog = function(value, btnLabel, fn)
	{
		var dlg = new LinkDialog(this, value, btnLabel, fn, true);
		this.showDialog(dlg.container, 500, 180, true, true);
		dlg.init();
	};
	
	//Viewer also had to change this in viewer (Graph.prototype.customLinkClicked)
	var origHandleCustomLink = ui.handleCustomLink;
	
	//This code is similar to AC.gotoAnchor but we don't have access to AC here
	ui.handleCustomLink = function(href)
	{
		if (href.substring(0, 23) == 'data:confluence/anchor,')
		{
			var anchor = href.substring(23);
			
			var newWin = window.open();
			
			if (anchor)
			{
				ui.remoteInvoke('getPageInfo', [true], null, function(info)
				{
					var url = info.url;
					
					if (url != null)
					{
						//remove any hash
						var hash = url.indexOf('#');
						
						if (hash > -1)
						{
							url = url.substring(0, hash);
						}
						
						//We assume the new editor for simplicity
						newWin.location = url + '#' + encodeURIComponent(anchor.replace(/\s/g, '-'));
					}
				}, function()
				{
					throw new Error('Unexpected Error');
				});
			}
			else
			{
				throw new Error('Empty Anchor');
			}
		}
		else
		{
			origHandleCustomLink.apply(ui, arguments);
		}
	};
	
	var origGetLinkTitle = ui.getLinkTitle;
	
	ui.getLinkTitle = function(href)
	{
		if (href.substring(0, 23) == 'data:confluence/anchor,')
		{
			return mxResources.get('anchor') + ': ' + href.substring(23);
		}
		else
		{
			return origGetLinkTitle.apply(ui, arguments);
		}
	};
	
	//======================== Revisions ========================
	
	ui.isRevisionHistoryEnabled = function()
	{
		return macroData.pageId != null;
	};
	
	ui.isRevisionHistorySupported = function()
	{
		return true;
	};

	/**
	 * Get revisions of current file
	 */
	ui.getRevisions = function(success, error)
	{
		function getXml(success, error)
		{
			ui.remoteInvoke('getFileContent', [this.downloadUrl], null, success, error);
		};
		
		function restoreFn(xml)
		{
			if (ui.spinner.spin(document.body, mxResources.get('restoring')))
			{
				ui.replaceFileData(xml);
				ui.spinner.stop();
				ui.hideDialog();
			}
		};
		
		ui.remoteInvoke('getDiagramRevisions', [macroData.diagramName, macroData.pageId], null, function(revisions)
		{
			//convert to editor format and add getXml function
			var revs = [];
			
			for (var i = 0; i < revisions.length; i++)
			{
				var rev = revisions[i];
				rev.getXml = mxUtils.bind(rev, getXml);
				revs.push(rev);
			}
			
			success(revs, restoreFn);
		}, error);
	};
	
	//============= Support Action ===============
	ui.actions.addAction('support...', function()
	{
		ui.remoteInvoke('getPageInfo', [true], null, function(info)
		{
			var url = info.url;
			
			if (url != null)
			{
				var wikiPos = url.indexOf('/wiki/');
				
				if (wikiPos > -1)
				{
					url = url.substring(0, wikiPos);
				}
				
				ui.openLink(url + '/wiki/plugins/servlet/ac/com.mxgraph.confluence.plugins.diagramly/support');
			}
			else
			{
				ui.openLink('https://about.draw.io/support/');
			}
		}, function()
		{
			ui.openLink('https://about.draw.io/support/');
		});
	});

	//=============Embed File with real-time collab support (based on remote invocation)
	//Until app.min.js is propagated, this code is necessary
	if (typeof EmbedFile === 'undefined')
	{
		var origInstallMessageHandler = ui.installMessageHandler;
		
		ui.installMessageHandler = function()
		{
			var parent = window.opener || window.parent;
			parent.postMessage(JSON.stringify({event: 'disableRT'}), '*');
			
			origInstallMessageHandler.apply(this, arguments);
		}
		
		return;	
	}
	
	/**
	 * Workaround for changing etag after save is higher autosave delay to allow
	 * for preflight etag update and decrease possible conflicts on file save.
	 */
	EmbedFile.prototype.autosaveDelay = 2500;

	/**
	 * Delay for last save in ms.
	 */
	EmbedFile.prototype.saveDelay = 0;

	/**
	 * 
	 */
	EmbedFile.prototype.isConflict = function(err)
	{
		return err != null && err.status == 409;
	};

	/**
	 * Returns the current user.
	 */
	EmbedFile.prototype.getCurrentUser = function()
	{
		return ui.getCurrentUser();
	};

	/**
	 * Returns true if an autosave is required at the time of execution.
	 */
	EmbedFile.prototype.isAutosave = function()
	{
		return this.desc.id != null;
	};

	/**
	 * Specifies if the autosave checkbox should be shown in the document
	 * properties dialog. Default is false.
	 */
	EmbedFile.prototype.isAutosaveOptional = function()
	{
		return this.desc.id == null;
	};
	
	/**
	 * 
	 */
	EmbedFile.prototype.isRenamable = function()
	{
		return this.isEditable() && DrawioFile.prototype.isEditable.apply(this, arguments);
	};

	/**
	 * 
	 */
	EmbedFile.prototype.save = function(revision, success, error, unloading, overwrite)
	{
		this.saveStarted = true;
		
		DrawioFile.prototype.save.apply(this, [revision, mxUtils.bind(this, function()
		{
			this.saveFile(null, revision, success, error, unloading, overwrite);
			this.saveStarted = false;
		}), error, unloading, overwrite]);
	};

	/**
	 * 
	 */
	EmbedFile.prototype.setModified = function(value)
	{
		DrawioFile.prototype.setModified.apply(this, arguments);
		
		//Set editor modified also to prevent accidental closure or exiting without saving  
		ui.editor.modified = value;
	};
	
	/**
	 * 
	 */
	EmbedFile.prototype.saveFile = function(title, revision, success, error, unloading, overwrite)
	{
		try
		{
			if (!this.isEditable())
			{
				if (success != null)
				{
					success();
				}
			}
			else if (!this.savingFile)
			{
				// Sets shadow modified state during save
				this.savingFileTime = new Date();
				this.setShadowModified(false);
				this.savingFile = true;

				this.createSecret(mxUtils.bind(this, function(secret, token)
				{
					var doSave = mxUtils.bind(this, function(realOverwrite, realRevision)
					{
						try
						{
							var lastDesc = this.desc;
							var savedData = this.getData();
							this.desc.secret = secret;
							this.desc.key = this.desc.key? this.desc.key : Editor.guid(32);
							this.desc.channel = this.desc.channel? this.desc.channel : Editor.guid(32);
							this.desc.etagP = this.desc.etagP? this.desc.etagP : Editor.guid(32);
							this.desc.title = this.desc.title? this.desc.title : macroData.diagramDisplayName;
							
							ui.remoteInvoke('saveDraftWithFileDesc', [savedData, this.desc], null, mxUtils.bind(this, function(resp)
							{
								try
								{
									this.savingFile = false;
									
									// Handles special case where resp is false eg
									// if the old file was converted to realtime
									if (resp != false)
									{
										// Checks for changes during save
										this.setModified(this.getShadowModified());
										
										if (revision)
										{
											this.lastAutosaveRevision = new Date().getTime();
										}
					
										// Adaptive autosave delay
										this.autosaveDelay = Math.min(8000,
											Math.max(this.saveDelay + 500,
											EmbedFile.prototype.autosaveDelay));
										this.desc = resp;
										
										// Shows possible errors but keeps the modified flag as the
										// file was saved but the cache entry could not be written
										if (token != null)
										{
											this.fileSaved(savedData, lastDesc, mxUtils.bind(this, function()
											{
												this.contentChanged();
												
												if (success != null)
												{
													success(resp);
												}
											}), error, token);
										}
										else
										{
											success(resp);
										}
									}
									else if (error != null)
									{
										error(resp);
									}
								}
								catch (e)
								{
									this.savingFile = false;
									
									if (error != null)
									{
										error(e);
									}
									else
									{
										throw e;
									}
								}
							}),
							mxUtils.bind(this, function(err, desc)
							{
								//TODO EMBED desc is null here 
								try
								{
									this.savingFile = false;
								
									if (this.isConflict(err))
									{
										this.inConflictState = true;
										
										if (this.sync != null)
										{
											this.savingFile = true;
											
											this.sync.fileConflict(desc, mxUtils.bind(this, function()
											{
												// Adds random cool-off
												window.setTimeout(mxUtils.bind(this, function()
												{
													this.updateFileData();
													this.setShadowModified(false);
													doSave(realOverwrite, true);
												}), 100 + Math.random() * 500 + (err.isLocked? 500 : 0));
											}), mxUtils.bind(this, function()
											{
												this.savingFile = false;
												
												if (error != null)
												{
													error();
												}
											}));
										}
										else if (error != null)
										{
											error();
										}
									}
									else if (error != null)
									{
										error(err);
									}
								}
								catch (e)
								{
									this.savingFile = false;
									
									if (error != null)
									{
										error(e);
									}
									else
									{
										throw e;
									}
								}
							}));
						}
						catch (e)
						{
							this.savingFile = false;
							
							if (error != null)
							{
								error(e);
							}
							else
							{
								throw e;
							}
						}
					});
					
					doSave(overwrite, revision);				
				}));
			}
		}
		catch (e)
		{
			if (error != null)
			{
				error(e);
			}
			else
			{
				throw e;
			}
		}
	};

	/**
	 * 
	 */
	EmbedFile.prototype.copyFile = function(success, error)
	{
		//Download a copy of the file since it is difficult to add a copy to current confluence page
		this.updateFileData();
		ui.doSaveLocalFile(this.data, this.getTitle(), 'text/xml');
		error(); //Since the problem is not fixed //TODO Confirm this is OK??
	};

	/**
	 * 
	 */
	EmbedFile.prototype.rename = function(title, success, error)
	{
		var etag = this.getCurrentEtag();
		this.desc.title = title;
		
		ui.remoteInvoke('setFileDescriptor', [this.desc], null, mxUtils.bind(this, function(desc)
		{
			this.desc = desc;
			this.descriptorChanged();
			
			if (this.sync != null)
			{
				this.sync.descriptorChanged(etag);
			}
			
			if (success != null)
			{
				success(desc);
			}
		}), error);
	};

	/**
	 * 
	 */
	EmbedFile.prototype.getTitle = function()
	{
		return this.desc.title || macroData.diagramDisplayName;
	};

	/**
	 * 
	 */
	EmbedFile.prototype.getHash = function()
	{
		return 'E' + this.getId();
	};

	/**
	 * 
	 */
	EmbedFile.prototype.getId = function()
	{
		return this.desc.id;
	};

	/**
	 * 
	 */
	EmbedFile.prototype.isSyncSupported = function()
	{
		return this.desc.id != null;
	};

	/**
	 * 
	 */
	EmbedFile.prototype.isRevisionHistorySupported = function()
	{
		return true;
	};

	/**
	 * 
	 */
	EmbedFile.prototype.getLatestVersion = function(success, error)
	{
		ui.remoteInvoke('getDraftFileContent', null, null, mxUtils.bind(this, function(data, desc)
		{
			success(new EmbedFile(ui, data, desc));
		}), error);
	};

	/**
	 * Gets the channel ID from the given descriptor.
	 */
	EmbedFile.prototype.getChannelId = function()
	{
		var chan = this.desc.channel;
		
		if (chan != null)
		{
			chan = 'E-' + this.getId() + '.' + chan;
		}
		
		return chan;
	};

	/**
	 * Gets the channel key from the given descriptor.
	 */
	EmbedFile.prototype.getChannelKey = function()
	{
		return this.desc.key;
	};

	/**
	 * 
	 */
	EmbedFile.prototype.getLastModifiedDate = function()
	{
		return new Date(this.desc.modifiedDate);
	};

	/**
	 * 
	 */
	EmbedFile.prototype.getDescriptor = function()
	{
		return this.desc;
	};

	/**
	* Updates the descriptor of this file with the one from the given file.
	*/
	EmbedFile.prototype.setDescriptor = function(desc)
	{
		this.desc = desc;
	};

	/**
	 * Returns the secret from the given descriptor.
	 */
	EmbedFile.prototype.getDescriptorSecret = function(desc)
	{
		return desc.secret;
	};

	/**
	 * Updates the revision ID on the given descriptor.
	 */
	EmbedFile.prototype.setDescriptorRevisionId = function(desc, id)
	{
		desc.headRevisionId = id;
	};

	/**
	 * Returns the revision ID from the given descriptor.
	 */
	EmbedFile.prototype.getDescriptorRevisionId = function(desc)
	{
		return desc.headRevisionId;
	};

	/**
	 * 
	 */
	EmbedFile.prototype.getDescriptorEtag = function(desc)
	{
		return desc.etag;
	};

	/**
	 *
	 */
	EmbedFile.prototype.setDescriptorEtag = function(desc, etag)
	{
		desc.etag = etag;
	};

	/**
	 * 
	 */
	EmbedFile.prototype.patchDescriptor = function(desc, patch)
	{
		DrawioFile.prototype.patchDescriptor.apply(this, arguments);
		
		desc.headRevisionId = patch.headRevisionId;
		desc.modifiedDate = patch.modifiedDate;
	};

	/**
	 * 
	 */
	EmbedFile.prototype.loadDescriptor = function(success, error)
	{
		ui.remoteInvoke('getFileDescriptor', null, null, success, error);
	};
	
	var allowAutoSave = true;
	
	EmbedFile.prototype.isAutosaveNow = function(success, error)
	{
		return allowAutoSave;
	};
	
	//Ensure saving of draft before publishing
	var origSaveAction = ui.actions.get('save').funct;
	
	ui.actions.get('save').funct = function(exit)
	{
		var actArgs = arguments;
		var curFile = ui.getCurrentFile();
		var desc = curFile.getDescriptor();
		var isNewFile = desc == null || desc.key == null;
		
		if (exit)
		{
			//Prevent stpping the spinner early by creating our own spinner
			var spinner = new Spinner({
				lines: 12, // The number of lines to draw
				length: 24, // The length of each line
				width: 8, // The line thickness
				radius: 12, // The radius of the inner circle
				rotate: 0, // The rotation offset
				color: '#000', // #rgb or #rrggbb
				speed: 1.5, // Rounds per second
				trail: 60, // Afterglow percentage
				shadow: false, // Whether to render a shadow
				hwaccel: false, // Whether to use hardware acceleration
				zIndex: 2e9 // The z-index (defaults to 2000000000)
			});
	
			if (!isNewFile)
			{
				spinner.spin(document.body);
			}
			
			allowAutoSave = false;
			
			if (desc != null)
			{
				desc.viewerSettings = {
					tbstyle: macroData.tbstyle,
					links: macroData.links,
					simple: macroData.simple,
					lbox: macroData.lbox,
					zoom: macroData.zoom,
					pCenter: macroData.pCenter,
					aspect:	macroData.aspect,
					hiResPreview: macroData.hiResPreview
				};
			}
			
			var etag = curFile.getCurrentEtag();
		}

		function doActions()
		{
			origSaveAction.apply(ui, actArgs);
			
			if (exit && curFile.sync != null)
			{
				curFile.sync.descriptorChanged(etag);
			}
		};
		
		function doSave()
		{
			if (curFile.saveStarted || curFile.savingFile)
			{
				setTimeout(doSave, 100);
				return;
			}
			
			if (curFile.isModified())
			{
				//Save file (draft) first
				ui.saveFile(null, doActions);
			}
			else if (exit) //Save descriptor only to update the viewer settings
			{
				ui.remoteInvoke('setFileDescriptor', [desc], null, doActions, doActions);
			}
			else
			{
				doActions();
			}
		};
		
		if (isNewFile)
		{
			//New files are saved directly and descriptor is added during publishing after creating the custom content
			doActions();
		}
		else
		{
			doSave();
		}
	};
	
	//Add file opening here (or it should be for all in EditorUi?)
	var origInstallMessageHandler =  ui.installMessageHandler;
	
	ui.installMessageHandler = function(callback)
	{
		origInstallMessageHandler.call(this, function()
		{
			callback.apply(this, arguments);
			
			var file = ui.getCurrentFile();
			
			file.loadDescriptor(function(desc)
			{
				file.desc = desc;
				ui.fileLoaded(file, true);
				
				if (file.desc)
				{
					var descChangedNeeded = false;
					
					if (file.desc.title && file.desc.title != macroData.diagramDisplayName)
					{
						macroData.diagramDisplayName = file.desc.title;
						descChangedNeeded = true;
					}
					
					if (file.desc.viewerSettings != null)
					{
						descChangedNeeded = true;
					}
					
					if (descChangedNeeded)
					{
						descriptorChangedListener();
					}
				}
			});
			
			file.addListener('descriptorChanged', descriptorChangedListener);
		});
	}
	
	ui.editor.setModified = function()
	{
		//Cancel set modified of the editor and use the file's one
	};
});
