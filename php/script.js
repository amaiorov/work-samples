var successHandler = function successHandler(_response) {
	if (!_response.success) {
		return 'Something went wrong, please try again.';
	}
	console.log('service says: ' + _response.message);
	if (_response.reload) {
		document.location.reload();
	}
};

$('td a').each(function(_i, _item) {
	var $this = $(this),
		type = $this.data('name'),
		pk = $this.data('id').split(':')[1],
		table = $this.data('id').split(':')[0],
		title = $(this).data('name'),
		action;
	switch(type) {
		case 'position':
			var tpl = '<input type=\"number\" min="1" />';
			action = 'position';
		// no break, fall through
		case 'category_name':
			if (!action) {
				action = type === 'category_name' && table === 'pdf' ? 'update_cat_id' : 'modify_cat_name';
			}
			$this.data('name', action === 'update_cat_id' ? 'category_id' : 'category_name');
		// no break, fall through
		case 'display_name':
			type = type === 'category_name' && table === 'pdf' ? 'select' : 'text';
			$this.editable({
				'type': type,
				'source': <?php echo $categoriesJSON; ?>, // generated by PHP
				'defautValue': null,
				'tpl': tpl,
				'pk': pk,
				'url': 'service.php',
				'params': {
					'action': action
				},
				'title': title,
				'clear': false,
				'inputclass': type === 'select' ? 'input-large' : 'imput-sm',
				'success': successHandler
			});
		break;
		case 'image':
			$this
				.append($('<span class="thumb" style="background-image:url(\'../files/' + $this.text() + '\')" />'))
				.css('font-size', 0);
		// no break, fall through
		case 'file_name':
			// create upload button
			$this.after($('<input data-name="' + type + '" id="' + type + _i +'" data-id="' + $this.data('id') + '" type="file">'));

			if ($this.text()) {
				// handle link on non-empty anchors
				$this.attr({
					'href': '../files/' + $this.text(),
					'target': '_blank'
				});
			} else {
				$this.removeAttr('href');
			}
		break;
		default:
	}
});

$('[type=file]').on('change', function() {
	var $this = $(this),
		validExtensions = {
			'image': ['.jpg', '.jpeg', '.gif', '.png'],
			'pdf': ['.pdf']
		},
		errorMessages = {
			'image': 'Please use an image file. Valid file types are: jpg, jpeg, gif, png.',
			'pdf': 'Please use a PDF file.'
		},
		type = $this.data('name') === 'image' ? 'image' : 'pdf';

	if (validExtensions[type].indexOf($this.val().match(/\..*$/g)[0]) === -1) {
		// handle error messaging for invalid file type
		alert(errorMessages[type]);
		$this.val('');
	} else {
		// serialize form data and send to web service
		var formData = new FormData();
		formData.append('action', 'upload_' + type);
		formData.append('pk', $this.data('id').split(':')[1]);
		formData.append('name', $this.data('name'));
		formData.append('file', $this.prop('files')[0]);
		// alert(formData);

		$.ajax({
			'url': 'service.php',
			'cache': false,
			'contentType': false,
			'processData': false,
			'data': formData,
			'method': 'post',
			'success': successHandler
		});		
	}
});

$('.edit span').click(function() {
	var $this = $(this),
		action = $this.data('action'),
		table = $this.data('id').split(':')[0];

	if (action === 'add') {
		// handle adding items
		$.ajax({
			'url': 'service.php',
			'method': 'post',
			'data': {
				'action': 'add_' + table,
			},
			'success': successHandler
		});
	} else {
		// handle removing items
		var message = 'Are you sure you want to remove this {{table}}? This cannot be undone!\n',
			id = $this.data('id').split(':')[1],
			category = $('#' + table + ' tr#' + id + ' .category_name a').text();
		message += ' \nCategory: ' + category;

		// change delete warning message based on type of data
		if (table === 'pdf') {
			var fileName = $('#' + table + ' tr#' + id + ' .file_name a').text(),
				displayName = $('#' + table + ' tr#' + id + ' .display_name a').text();
			message += ' \nFile: ' + fileName;
			message += ' \nDisplay name: ' + displayName;
			message = message.replace(/\{\{table\}\}/, 'file');
		} else {
			message += '\n\nNOTE: this will also remove all PDFs for this category.';
			message = message.replace(/\{\{table\}\}/, 'category');
		}

		// user confirmed deletion, send to web service
		if (confirm(message)) {
			$.ajax({
				'url': 'service.php',
				'method': 'post',
				'data': {
					'action': 'delete_' + table,
					'pk': id
				},
				'success': successHandler
			});
		}
	}
});