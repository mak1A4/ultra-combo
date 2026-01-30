/**
 * Angular directive wrapper for ultra-combo web component
 * Bridges Lit CustomEvents to Angular's digest cycle
 *
 * Usage in AngularJS templates:
 *   <rope-ultra-combo ng-model="value" fetch-url="/api/..." ...></rope-ultra-combo>
 */
;(function() {
    'use strict';

    angular.module('x_twgh_ropewidgets.ultraCombo', [])
        .directive('ropeUltraCombo', ['$timeout', function($timeout) {
            return {
                restrict: 'E',
                scope: {
                    ngModel: '=',
                    fetchUrl: '@',
                    placeholder: '@',
                    multiple: '<?',
                    valueKey: '@',
                    labelKey: '@',
                    resultsPath: '@',
                    totalPath: '@',
                    columns: '@',
                    columnHeaders: '@',
                    showHeader: '<?',
                    dependsOn: '@',
                    dependsParam: '@',
                    disableWithoutParent: '<?',
                    displayTemplate: '@',
                    searchColumns: '@',
                    pageSize: '@',
                    debounce: '@',
                    autoload: '<?',
                    size: '@',
                    disabled: '<?',
                    dropdownMaxWidth: '@',
                    columnMaxWidth: '@',
                    wrapText: '<?',
                    fullWidth: '<?',
                    staticOptions: '<',
                    onChange: '&'
                },
                template: '<div class="rope-ultra-combo-wrapper"></div>',
                link: function(scope, element) {
                    var wrapper = element[0].querySelector('.rope-ultra-combo-wrapper');
                    var combo = document.createElement('ultra-combo');

                    // Map attribute names (Angular camelCase to HTML kebab-case)
                    var attrMap = {
                        'fetchUrl': 'fetch-url',
                        'valueKey': 'value-key',
                        'labelKey': 'label-key',
                        'resultsPath': 'results-path',
                        'totalPath': 'total-path',
                        'columnHeaders': 'column-headers',
                        'dependsOn': 'depends-on',
                        'dependsParam': 'depends-param',
                        'disableWithoutParent': 'disable-without-parent',
                        'displayTemplate': 'display-template',
                        'searchColumns': 'search-columns',
                        'pageSize': 'page-size',
                        'showHeader': 'show-header',
                        'dropdownMaxWidth': 'dropdown-max-width',
                        'columnMaxWidth': 'column-max-width',
                        'wrapText': 'wrap-text',
                        'fullWidth': 'full-width'
                    };

                    // Set string attributes
                    Object.keys(attrMap).forEach(function(angularAttr) {
                        var htmlAttr = attrMap[angularAttr];
                        if (scope[angularAttr] !== undefined && scope[angularAttr] !== '') {
                            combo.setAttribute(htmlAttr, scope[angularAttr]);
                        }
                    });

                    // Direct attributes
                    if (scope.placeholder) combo.setAttribute('placeholder', scope.placeholder);
                    if (scope.columns) combo.setAttribute('columns', scope.columns);
                    if (scope.debounce) combo.setAttribute('debounce', scope.debounce);
                    if (scope.size) combo.setAttribute('size', scope.size);

                    // Boolean attributes
                    if (scope.multiple) combo.setAttribute('multiple', '');
                    if (scope.showHeader) combo.setAttribute('show-header', '');
                    if (scope.disableWithoutParent) combo.setAttribute('disable-without-parent', '');
                    if (scope.autoload) combo.setAttribute('autoload', '');
                    if (scope.wrapText) combo.setAttribute('wrap-text', '');
                    if (scope.fullWidth) combo.setAttribute('full-width', '');

                    // Set authentication headers for ServiceNow Table API
                    // g_ck is the CSRF token provided by ServiceNow
                    if (window.g_ck) {
                        combo.fetchHeaders = { 'X-UserToken': window.g_ck };
                    }

                    // Set initial value
                    if (scope.ngModel) {
                        combo.value = scope.ngModel;
                    }

                    // Handle disabled state
                    scope.$watch('disabled', function(newVal) {
                        if (newVal) {
                            combo.setAttribute('disabled', '');
                        } else {
                            combo.removeAttribute('disabled');
                        }
                    });

                    // Listen for change events from ultra-combo
                    combo.addEventListener('change', function(e) {
                        $timeout(function() {
                            if (scope.multiple) {
                                scope.ngModel = e.detail.value; // comma-separated
                            } else {
                                scope.ngModel = e.detail.value;
                            }

                            // Call onChange callback if provided
                            if (scope.onChange) {
                                scope.onChange({
                                    value: e.detail.value,
                                    label: e.detail.label,
                                    values: e.detail.values,
                                    labels: e.detail.labels
                                });
                            }
                        });
                    });

                    // Watch for external ngModel changes
                    scope.$watch('ngModel', function(newVal, oldVal) {
                        if (newVal !== oldVal && combo.value !== newVal) {
                            combo.value = newVal || '';
                        }
                    });

                    // Watch for fetchUrl changes (dynamic queries)
                    scope.$watch('fetchUrl', function(newVal, oldVal) {
                        if (newVal !== oldVal && newVal) {
                            combo.setAttribute('fetch-url', newVal);
                        }
                    });

                    // Watch for staticOptions changes (async loading)
                    scope.$watch('staticOptions', function(newVal, oldVal) {
                        if (newVal !== oldVal) {
                            var jsonVal = newVal ? JSON.stringify(newVal) : '[]';
                            combo.setAttribute('static-options', jsonVal);
                        }
                    }, true);

                    // Append combo to wrapper
                    wrapper.appendChild(combo);

                    // Cleanup on destroy
                    scope.$on('$destroy', function() {
                        combo.remove();
                    });
                }
            };
        }]);
})();
